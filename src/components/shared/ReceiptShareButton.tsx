import { useState } from 'react';
import { Check, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { openReceiptInWhatsApp } from '@/lib/shareReceiptWhatsApp';

interface ReceiptShareButtonProps {
  receiptId: string;
  receiptImageUrl: string;
  sharedAt: string | null;
  referenceNumber: string;
  buyerName: string;
  buyerPhone: string;
  destination: string;
  saco?: string | null;
  onShared: (receiptId: string) => void;
}

/**
 * Sends a copy of one receipt to the buyer on WhatsApp, then marks it shared so
 * the button stays grey.
 */
export function ReceiptShareButton({
  receiptId,
  receiptImageUrl,
  sharedAt,
  referenceNumber,
  buyerName,
  buyerPhone,
  destination,
  saco,
  onShared,
}: ReceiptShareButtonProps) {
  const [busy, setBusy] = useState(false);

  if (sharedAt) {
    return (
      <Button
        size="sm"
        variant="secondary"
        disabled
        title="Receipt has already been shared with the buyer"
        className="w-full h-8 text-xs bg-muted text-muted-foreground disabled:opacity-100"
      >
        <Check className="h-3.5 w-3.5 text-emerald-600" /> Sent to Buyer
      </Button>
    );
  }

  // Opens WhatsApp with the receipt ready; staff press Send themselves.
  async function share() {
    setBusy(true);
    try {
      const result = await openReceiptInWhatsApp({
        receiptImageUrl,
        referenceNumber,
        buyerName,
        buyerPhone,
        destination,
        saco,
      });
      if (!result.ok) toast.error(result.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      size="sm"
      onClick={share}
      disabled={busy}
      title={`Send receipt copy to buyer (${buyerName}) on WhatsApp`}
      aria-label={`Send receipt copy to buyer ${buyerName} on WhatsApp`}
      className="w-full h-8 text-xs font-medium"
    >
      {busy ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending…
        </>
      ) : (
        <>
          <Send className="h-3.5 w-3.5" /> Share to Buyer
        </>
      )}
    </Button>
  );
}
