import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Parcel, Destination, Sacco, SendingMethod } from '@/types/database';

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
  /** Storage path of an optional product screenshot uploaded at dispatch time. */
  product_image_url?: string | null;
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
      const { data, error: insertErr } = await supabase.rpc('seller_create_parcel', {
        _input: { ...input },
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
      const parcel = data['parcel'];
      if (!parcel || typeof parcel !== 'object' || Array.isArray(parcel)) {
        return { data: null, error: new Error('Order could not be created') };
      }

      // Refresh list to ensure trigger values (ref number, computed fees) are present
      await fetchParcels();
      return { data: parcel as unknown as Parcel, error: null };
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
