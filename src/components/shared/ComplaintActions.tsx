import { useState } from 'react';
import { CheckCircle, MessageCircle, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import type { Complaint } from '@/types/database';

export function ComplaintActions({ complaint, onResolved, disabled }: {
  complaint: Complaint;
  onResolved: (id: string) => void;
  disabled?: boolean;
}) {
  const [resolving, setResolving] = useState(false);
  const digits = complaint.buyer_phone.replace(/\D/g, '');
  const phone = digits.startsWith('254') ? digits : `254${digits.replace(/^0/, '')}`;

  async function resolve() {
    setResolving(true);
    try {
      const { data, error } = await supabase.rpc('resolve_buyer_complaint', { p_complaint_id: complaint.id });
      if (error || !data) throw new Error('Resolution not saved');
      onResolved(complaint.id);
      toast.success('Issue resolved');
    } catch {
      toast.error('Could not resolve this issue. Refresh the list and try again.');
    } finally {
      setResolving(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {/^(254)[17]\d{8}$/.test(phone) && (
        <>
          <Button asChild variant="outline" className="min-h-11 text-xs">
            <a href={`https://wa.me/${phone}`} target="_blank" rel="noopener noreferrer"><MessageCircle /> Chat on WhatsApp</a>
          </Button>
          <Button asChild variant="outline" className="min-h-11 text-xs">
            <a href={`tel:+${phone}`}><Phone /> Call</a>
          </Button>
        </>
      )}
      {complaint.status !== 'resolved' && (
        <Button type="button" className="min-h-11 text-xs" onClick={resolve} disabled={disabled || resolving}>
          <CheckCircle /> {resolving ? 'Resolving…' : 'Resolve'}
        </Button>
      )}
    </div>
  );
}