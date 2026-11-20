import { useCallback, useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';

/** Red banner for staff/admin counting PSV parcels in transit with no shared receipt. */
export function PendingReceiptsBanner() {
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    const [{ data: parcels }, { data: receipts }] = await Promise.all([
      supabase.from('parcels').select('id').eq('tracking_status', 'on_transit').eq('sending_method', 'psv'),
      supabase.from('parcel_receipts').select('parcel_id'),
    ]);
    const shared = new Set((receipts || []).map((r) => r.parcel_id));
    setCount((parcels || []).filter((p) => !shared.has(p.id)).length);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase
      .channel('pending_receipts_banner')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parcels' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parcel_receipts' }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  if (count === 0) return null;
  return (
    <div role="alert" className="mb-4 flex flex-col gap-3 rounded-xl bg-destructive p-3 text-destructive-foreground sm:flex-row sm:items-center">
      <AlertTriangle className="hidden h-5 w-5 shrink-0 sm:block" />
      <p className="flex-1 text-sm font-semibold">
        Share {count} Pending Receipt{count === 1 ? '' : 's'} for Parcels in Active Transit
      </p>
      <Button asChild size="sm" variant="secondary" className="w-full sm:w-auto">
        <Link to="/pap/dispatch" search={{ tab: 'transit' }}>Share Now</Link>
      </Button>
    </div>
  );
}
