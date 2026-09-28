import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Parcel, ParcelTracking, ParcelReceipt, TrackingStatus } from '@/types/database';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    fetchParcels();

    const channel = supabase
      .channel('pap_operations_parcels')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'parcels' },
        () => {
          fetchParcels();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchParcels]);

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
      if (options.dispatchType === 'psv_official') {
        notes = `Dispatched via PSV (${options.saccoName || 'SACCO'}) official office. Receipt issued.`;
      } else if (options.dispatchType === 'psv_unofficial') {
        notes = `Dispatched via PSV driver: ${options.driverName || 'Driver'} (${options.driverPhone || 'No phone'}), Vehicle: ${options.vehiclePlate || 'N/A'}. Unofficial dispatch.`;
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

      // Update parcel status
      const { error: updateErr } = await supabase
        .from('parcels')
        .update({
          tracking_status: 'on_transit' as TrackingStatus,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', parcelId);

      if (updateErr) throw updateErr;

      // Insert tracking history
      await supabase.from('parcel_tracking').insert({
        parcel_id: parcelId,
        status: 'on_transit' as TrackingStatus,
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

      // 2. Retrieve public URL
      const { data: urlData } = supabase.storage
        .from('receipts')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

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

      return { data: receiptRecord as ParcelReceipt, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  }, [staffUserId]);

  return {
    parcels,
    loading,
    error,
    receiveParcels,
    dispatchParcel,
    deliverParcel,
    uploadReceipt,
    refetch: fetchParcels,
  };
}
