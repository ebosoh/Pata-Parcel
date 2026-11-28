import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { saveDispatchDriver } from '@/lib/drivers';
import type { Parcel, ParcelTracking, ParcelReceipt, TrackingStatus, Destination } from '@/types/database';
import type { CreateParcelInput } from '@/hooks/useParcels';

export interface ParcelWithSeller extends Parcel {
  seller?: {
    business_name: string | null;
    owner_name: string;
    phone: string;
  } | null;
}

export type PapDispatchType = 
  | 'psv_official' 
  | 'psv_unofficial' 
  | 'pickup_mtaani' 
  | 'door_to_door' 
  | 'pata_parcel';

export interface DispatchOptions {
  dispatchType: PapDispatchType;
  saccoName?: string | undefined;
  driverName?: string | undefined;
  driverPhone?: string | undefined;
  vehiclePlate?: string | undefined;
  pickupStation?: string | undefined;
  riderName?: string | undefined;
  riderPhone?: string | undefined;
  notes?: string | undefined;
}

export function usePapOperations(staffUserId?: string | null) {
  const [parcels, setParcels] = useState<ParcelWithSeller[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Latest shared receipt per parcel (parcel_id -> receipt)
  const [receiptsByParcel, setReceiptsByParcel] = useState<Record<string, ParcelReceipt>>({});

  // Fetch active destinations for parcel creation
  const fetchDestinations = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('destinations')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (data) setDestinations(data as Destination[]);
    } catch (err) {
      console.warn('Could not fetch destinations from db:', err);
    }
  }, []);

  // Fetch every receipt shared so far, keeping the newest one per parcel
  const fetchReceipts = useCallback(async () => {
    const { data, error: rErr } = await supabase
      .from('parcel_receipts')
      .select('*')
      .order('created_at', { ascending: false });

    if (rErr) return;

    const map: Record<string, ParcelReceipt> = {};
    (data || []).forEach(r => {
      if (!map[r.parcel_id]) map[r.parcel_id] = r;
    });
    setReceiptsByParcel(map);
  }, []);

  // Fetch all parcels with seller details
  const fetchParcels = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch parcels
      const { data: parcelsData, error: pErr } = await supabase
        .from('parcels')
        .select('*')
        .order('created_at', { ascending: false });

      if (pErr) throw pErr;

      // Fetch profiles to map sellers
      const sellerIds = Array.from(new Set((parcelsData || []).map(p => p.seller_id)));
      let sellerMap = new Map();

      if (sellerIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, business_name, owner_name, phone')
          .in('id', sellerIds);

        if (profilesData) {
          profilesData.forEach(pr => sellerMap.set(pr.id, pr));
        }
      }

      const combined: ParcelWithSeller[] = (parcelsData || []).map(p => ({
        ...p,
        seller: sellerMap.get(p.seller_id) || null,
      }));

      setParcels(combined);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch operations parcels');
    } finally {
      setLoading(false);
    }
  }, []);

  // Realtime subscription
  useEffect(() => {
    fetchDestinations();
    fetchParcels();
    fetchReceipts();

    const channel = supabase
      .channel('pap_operations_parcels')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'parcels' },
        () => {
          fetchParcels();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'parcel_receipts' },
        () => {
          fetchReceipts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchDestinations, fetchParcels, fetchReceipts]);

  // Batch or single receive parcels into "sorting"
  const receiveParcels = useCallback(async (parcelIds: string[]) => {
    if (!staffUserId || parcelIds.length === 0) return { error: new Error('Missing staff user or parcel IDs') };

    try {
      // 1. Update status to 'sorting'
      const { error: updateErr } = await supabase
        .from('parcels')
        .update({
          tracking_status: 'sorting' as TrackingStatus,
          updated_at: new Date().toISOString(),
        } as any)
        .in('id', parcelIds);

      if (updateErr) throw updateErr;

      // 2. Insert tracking records
      const trackingRows = parcelIds.map(id => ({
        parcel_id: id,
        status: 'sorting' as TrackingStatus,
        updated_by: staffUserId,
        notes: 'Parcel received at PAP sorting hub',
      }));

      await supabase.from('parcel_tracking').insert(trackingRows as any);

      await fetchParcels();
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  }, [staffUserId, fetchParcels]);

  // Dispatch a parcel to "on_transit"
  const dispatchParcel = useCallback(async (parcelId: string, options: DispatchOptions) => {
    if (!staffUserId) return { error: new Error('Staff user not authenticated') };

    try {
      // Construct descriptive tracking notes based on dispatch method
      let notes = '';
      const isDeliveredImmediately = options.dispatchType === 'psv_unofficial';

      if (options.dispatchType === 'psv_official') {
        notes = `Dispatched via PSV (${options.saccoName || 'SACCO'}) official office. Receipt issued.`;
      } else if (options.dispatchType === 'psv_unofficial') {
        notes = `Dispatched to driver ${options.driverName || 'Driver'} (${options.driverPhone || 'No phone'}), Vehicle: ${options.vehiclePlate || 'N/A'}. Handover complete — marked as delivered.`;
      } else if (options.dispatchType === 'pickup_mtaani') {
        notes = `Delivered to Pick-up Mtaani agent (${options.pickupStation || 'Station'}). Receipt issued.`;
      } else if (options.dispatchType === 'door_to_door') {
        notes = `Dispatched for Door-to-Door delivery by rider: ${options.riderName || 'Rider'} (${options.riderPhone || 'N/A'}).`;
      } else if (options.dispatchType === 'pata_parcel') {
        notes = `Sent to Pata Parcel Pick-up Point (${options.pickupStation || 'Drop-off point'}).`;
      }

      if (options.notes) {
        notes += ` Details: ${options.notes}`;
      }

      const targetStatus: TrackingStatus = isDeliveredImmediately ? 'delivered' : 'on_transit';

      // If driver details are present, save driver record
      if (options.dispatchType === 'psv_unofficial' && options.driverName && options.driverPhone && options.vehiclePlate) {
        try {
          await saveDispatchDriver({
            driver_name: options.driverName.trim(),
            driver_phone: options.driverPhone.trim(),
            vehicle_plate: options.vehiclePlate.trim().toUpperCase(),
            sacco_name: options.saccoName?.trim() || null,
            parcel_id: parcelId,
            created_by: staffUserId,
            destination: null,
          });
        } catch (driverErr) {
          console.warn('Could not save driver:', driverErr);
        }
      }

      // Update parcel status
      const { error: updateErr } = await supabase
        .from('parcels')
        .update({
          tracking_status: targetStatus,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', parcelId);

      if (updateErr) throw updateErr;

      // Insert tracking history
      await supabase.from('parcel_tracking').insert({
        parcel_id: parcelId,
        status: targetStatus,
        updated_by: staffUserId,
        notes,
      } as any);

      await fetchParcels();
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  }, [staffUserId, fetchParcels]);

  // Mark parcel as delivered
  const deliverParcel = useCallback(async (parcelId: string, notes?: string) => {
    if (!staffUserId) return { error: new Error('Staff user not authenticated') };

    try {
      const { error: updateErr } = await supabase
        .from('parcels')
        .update({
          tracking_status: 'delivered' as TrackingStatus,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', parcelId);

      if (updateErr) throw updateErr;

      await supabase.from('parcel_tracking').insert({
        parcel_id: parcelId,
        status: 'delivered' as TrackingStatus,
        updated_by: staffUserId,
        notes: notes || 'Parcel confirmed delivered to buyer / customer',
      } as any);

      await fetchParcels();
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  }, [staffUserId, fetchParcels]);

  // Reverse a delivered/completed parcel back to sorting stage
  const reversePickup = useCallback(async (parcelId: string, notes?: string) => {
    if (!staffUserId) return { error: new Error('Staff user not authenticated') };

    try {
      const { error: updateErr } = await supabase
        .from('parcels')
        .update({
          tracking_status: 'sorting' as TrackingStatus,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', parcelId);

      if (updateErr) throw updateErr;

      await supabase.from('parcel_tracking').insert({
        parcel_id: parcelId,
        status: 'sorting' as TrackingStatus,
        updated_by: staffUserId,
        notes: notes || 'Pick-up action reversed by admin — parcel returned to sorting',
      } as any);

      await fetchParcels();
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  }, [staffUserId, fetchParcels]);

  // Batch reverse multiple delivered parcels back to sorting stage
  const batchReversePickup = useCallback(async (parcelIds: string[]) => {
    if (!staffUserId || parcelIds.length === 0) return { error: new Error('Missing staff user or parcel IDs') };

    try {
      const { error: updateErr } = await supabase
        .from('parcels')
        .update({
          tracking_status: 'sorting' as TrackingStatus,
          updated_at: new Date().toISOString(),
        } as any)
        .in('id', parcelIds);

      if (updateErr) throw updateErr;

      const trackingRows = parcelIds.map(id => ({
        parcel_id: id,
        status: 'sorting' as TrackingStatus,
        updated_by: staffUserId,
        notes: 'Pick-up action reversed by admin — parcel returned to sorting',
      }));

      await supabase.from('parcel_tracking').insert(trackingRows as any);

      await fetchParcels();
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  }, [staffUserId, fetchParcels]);

  // Upload receipt image to Supabase Storage and link to parcel
  const uploadReceipt = useCallback(async (parcelId: string, file: File) => {
    if (!staffUserId) return { data: null, error: new Error('Staff user not authenticated') };

    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${parcelId}-${Date.now()}.${fileExt}`;
      const filePath = `receipts/${fileName}`;

      // 1. Upload to Supabase Storage receipts bucket
      const { error: uploadErr } = await supabase.storage
        .from('receipts')
        .upload(filePath, file, {
          contentType: file.type || 'image/jpeg',
          upsert: true,
        });

      if (uploadErr) throw uploadErr;

      // 2. Save the private file path; images are shown via signed links
      const publicUrl = filePath;

      // 3. Insert record into parcel_receipts
      const { data: receiptRecord, error: insertErr } = await supabase
        .from('parcel_receipts')
        .insert({
          parcel_id: parcelId,
          uploaded_by: staffUserId,
          receipt_image_url: publicUrl,
        } as any)
        .select()
        .single();

      if (insertErr) throw insertErr;

      // When a receipt is uploaded and shared for a SACCO parcel, mark parcel as delivered
      try {
        await supabase
          .from('parcels')
          .update({
            tracking_status: 'delivered' as TrackingStatus,
            updated_at: new Date().toISOString(),
          } as any)
          .eq('id', parcelId);

        await supabase.from('parcel_tracking').insert({
          parcel_id: parcelId,
          status: 'delivered' as TrackingStatus,
          updated_by: staffUserId,
          notes: 'Receipt uploaded and shared with seller / customer. Parcel marked as delivered.',
        } as any);
      } catch (markErr) {
        console.warn('Could not mark parcel delivered upon receipt upload:', markErr);
      }

      await fetchReceipts();
      await fetchParcels();
      return { data: receiptRecord as ParcelReceipt, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  }, [staffUserId, fetchReceipts]);

  // Create a new parcel directly from staff account
  const createParcel = useCallback(async (input: CreateParcelInput) => {
    if (!staffUserId) {
      return { data: null, error: new Error('You must be logged in to dispatch parcels') };
    }

    try {
      const { data, error: insertErr } = await supabase.rpc('seller_create_parcel', {
        _input: { ...input, order_source: 'staff' },
      });
      if (insertErr) {
        return { data: null, error: insertErr };
      }
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return { data: null, error: new Error('Order could not be created') };
      }
      if (typeof data['error'] === 'string') {
        return { data: null, error: new Error(data['error']) };
      }
      const parcel = data['parcel'] as Parcel;
      if (!parcel || typeof parcel !== 'object' || Array.isArray(parcel)) {
        return { data: null, error: new Error('Order could not be created') };
      }

      // Immediately verify & transition to sorting hub so it is ready for dispatch
      try {
        await supabase.rpc('seller_verify_and_dispatch', { _parcel_id: parcel.id });
      } catch (verifyErr) {
        console.warn('Could not auto-verify dispatch:', verifyErr);
      }

      // Tag as staff so it can be distinguished from seller dispatches in the queue
      try {
        await supabase
          .from('parcels')
          .update({ order_source: 'staff' } as any)
          .eq('id', parcel.id);
      } catch (tagErr) {
        console.warn('Could not tag order_source as staff:', tagErr);
      }

      try {
        await supabase
          .from('parcels')
          .update({
            tracking_status: 'sorting' as TrackingStatus,
            updated_at: new Date().toISOString(),
          } as any)
          .eq('id', parcel.id);

        await supabase.from('parcel_tracking').insert({
          parcel_id: parcel.id,
          status: 'sorting' as TrackingStatus,
          updated_by: staffUserId,
          notes: 'Dispatch created directly by PAP staff and received into sorting hub',
        } as any);
      } catch (sortErr) {
        console.warn('Could not update status to sorting:', sortErr);
      }

      await fetchParcels();
      return { data: parcel, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  }, [staffUserId, fetchParcels]);

  return {
    parcels,
    destinations,
    loading,
    error,
    receiptsByParcel,
    receiveParcels,
    dispatchParcel,
    deliverParcel,
    reversePickup,
    batchReversePickup,
    uploadReceipt,
    createParcel,
    refetch: fetchParcels,
  };
}
