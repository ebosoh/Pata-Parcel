import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Parcel, Destination, Sacco, SendingMethod, PaymentStatus, TrackingStatus } from '@/types/database';

export interface CreateParcelInput {
  buyer_name: string;
  buyer_phone: string;
  destination: string;
  sending_method: SendingMethod;
  psv_sacco?: string | null;
  pick_point?: string | null;
  package_type: string;
  package_description?: string | null;
  /** Total sending fee in KES; ignored (0) for PSV-Driver, which is paid on delivery. */
  sending_fee: number;
  goods_amount?: number | null;
  payment_code?: string | null;
}

export function useParcels(sellerId?: string | null) {
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [saccos, setSaccos] = useState<Sacco[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch reference metadata (destinations & saccos)
  const fetchMetadata = useCallback(async () => {
    try {
      const [destRes, saccoRes] = await Promise.all([
        supabase.from('destinations').select('*').eq('is_active', true).order('name'),
        supabase.from('saccos').select('*').eq('is_active', true).order('name'),
      ]);

      if (destRes.data) setDestinations(destRes.data as Destination[]);
      if (saccoRes.data) setSaccos(saccoRes.data as Sacco[]);
    } catch (err) {
      console.warn('Could not fetch destinations/saccos from db, using defaults:', err);
    }
  }, []);

  // Fetch parcels
  const fetchParcels = useCallback(async () => {
    if (!sellerId) {
      setParcels([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('parcels')
        .select('*')
        .order('created_at', { ascending: false });

      if (sellerId) {
        query = query.eq('seller_id', sellerId);
      }

      const { data, error: fetchErr } = await query;

      if (fetchErr) {
        setError(fetchErr.message);
      } else {
        setParcels((data as Parcel[]) || []);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch parcels');
    } finally {
      setLoading(false);
    }
  }, [sellerId]);

  // Initial fetch + Realtime subscription
  useEffect(() => {
    fetchMetadata();
    fetchParcels();

    // Subscribe to realtime changes on parcels table
    const channel = supabase
      .channel('public:parcels')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'parcels',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newParcel = payload.new as Parcel;
            if (!sellerId || newParcel.seller_id === sellerId) {
              setParcels(prev => [newParcel, ...prev]);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Parcel;
            setParcels(prev => prev.map(p => p.id === updated.id ? updated : p));
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as any)?.id;
            setParcels(prev => prev.filter(p => p.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sellerId, fetchMetadata, fetchParcels]);

  // Create a new parcel
  const createParcel = useCallback(async (input: CreateParcelInput) => {
    if (!sellerId) {
      return { data: null, error: new Error('You must be logged in as a seller to dispatch parcels') };
    }

    try {
      const insertPayload: Record<string, any> = {
        seller_id: sellerId,
        buyer_name: input.buyer_name.trim(),
        buyer_phone: input.buyer_phone.trim(),
        destination: input.destination,
        sending_method: input.sending_method,
        psv_sacco: input.sending_method === 'psv' || input.sending_method === 'psv_driver' ? (input.psv_sacco || null) : null,
        pick_point: input.sending_method === 'door_to_door' ? (input.pick_point || null) : null,
        package_type: input.package_type,
        package_description: input.package_description?.trim() || null,
        num_packages: 1,
        // Per-package column is deprecated but kept populated.
        sending_fee_per_package: input.sending_method === 'psv_driver' ? 0 : input.sending_fee,
        total_sending_fee: input.sending_method === 'psv_driver' ? 0 : input.sending_fee,
        payment_status: (input.sending_method === 'psv_driver' ? 'pay_on_delivery' : 'paid') as PaymentStatus,
        goods_amount: input.goods_amount ?? null,
        payment_code: input.payment_code?.trim().toUpperCase() || null,
        goods_paid: false,
        order_source: 'seller',
        // Stays in the seller's list until they verify payment and dispatch.
        tracking_status: 'awaiting_verification' as TrackingStatus,
      };

      let { data, error: insertErr } = await supabase
        .from('parcels')
        .insert(insertPayload as any)
        .select()
        .single();

      // Graceful fallback if remote database column 'pick_point' is not yet migrated
      if (insertErr && (insertErr.message?.includes('pick_point') || (insertErr as any).code === '42703')) {
        delete insertPayload['pick_point'];
        if (input.pick_point && !(insertPayload['destination'] as string).includes(input.pick_point)) {
          insertPayload['destination'] = `${insertPayload['destination']} - ${input.pick_point}`;
        }
        const retryResult = await supabase
          .from('parcels')
          .insert(insertPayload as any)
          .select()
          .single();
        data = retryResult.data;
        insertErr = retryResult.error;
      }

      if (insertErr) {
        return { data: null, error: insertErr };
      }

      // Refresh list to ensure trigger values (ref number, computed fees) are present
      await fetchParcels();
      return { data: data as Parcel, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  }, [sellerId, fetchParcels]);

  return {
    parcels,
    destinations,
    saccos,
    loading,
    error,
    createParcel,
    refetch: fetchParcels,
  };
}
