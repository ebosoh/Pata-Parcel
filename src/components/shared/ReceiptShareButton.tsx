import { useState } from 'react';
import { Check, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { toStoragePath } from '@/components/shared/StorageImage';
import { buildReceiptShareMessage, waRecipientFor, waShareUrl, shortenReceiptUrl } from '@/lib/receiptSharing';

const BUCKET = 'receipts';
/** The buyer gets a week to open the receipt copy. */
const LINK_VALID_SECONDS = 60 * 60 * 24 * 7;

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

// Updated: Share button now only opens WhatsApp with the receipt ready. Staff must manually send.
  async function share() {
    const recipient = waRecipientFor(buyerPhone);
    if (!recipient) {
      toast.error(`The buyer (${buyerName || 'buyer'}) has no valid Kenyan phone number to receive the receipt.`);
      return;
    }

    const path = toStoragePath(receiptImageUrl);
    if (!path) {
      toast.error('This receipt photo is not available to send.');
      return;
    }

    setBusy(true);
    try {
      const { data: signed, error: signError } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(path, LINK_VALID_SECONDS);

      if (signError || !signed?.signedUrl) {
        console.error('Failed to open receipt for sharing:', signError);
        toast.error('Could not open the receipt to send. Please try again.');
        return;
      }

      const shortUrl = await shortenReceiptUrl(signed.signedUrl);

      const message = buildReceiptShareMessage({
        referenceNumber,
        buyerName,
        destination,
        saco,
        receiptLink: shortUrl,
      });

      const link = document.createElement('a');
      link.href = waShareUrl(recipient, message);
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      link.remove();

      // No automatic RPC call to mark as shared; staff can confirm later.
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
