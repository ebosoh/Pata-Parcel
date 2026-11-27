import { supabase } from '@/lib/supabase';
import { toStoragePath } from '@/components/shared/StorageImage';
import {
  buildReceiptShareMessage,
  shortenReceiptUrl,
  waRecipientFor,
  waShareUrl,
} from '@/lib/receiptSharing';
import { trackShareReceiptWhatsApp } from '@/lib/analytics';

const BUCKET = 'receipts';
/** The buyer gets a week to open the receipt copy. */
const LINK_VALID_SECONDS = 60 * 60 * 24 * 7;

export interface ReceiptWhatsAppShare {
  receiptImageUrl: string;
  referenceNumber: string;
  buyerName: string;
  buyerPhone: string;
  destination: string;
  saco?: string | null | undefined;
}

export type ReceiptWhatsAppResult = { ok: true } | { ok: false; message: string };

/**
 * Opens WhatsApp on the buyer's chat with the receipt message typed in; staff
 * press Send themselves. Call directly from a click handler: the tab is opened
 * before any waiting so phone browsers do not block it.
 */
export async function openReceiptInWhatsApp(share: ReceiptWhatsAppShare): Promise<ReceiptWhatsAppResult> {
  const recipient = waRecipientFor(share.buyerPhone);
  if (!recipient) {
    return {
      ok: false,
      message: `The buyer (${share.buyerName || 'buyer'}) has no valid Kenyan phone number to receive the receipt.`,
    };
  }

  const path = toStoragePath(share.receiptImageUrl);
  if (!path) return { ok: false, message: 'This receipt photo is not available to send.' };

  const tab = window.open('', '_blank');

  const { data: signed, error: signError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, LINK_VALID_SECONDS);

  if (signError || !signed?.signedUrl) {
    console.error('Failed to open receipt for sharing:', signError);
    tab?.close();
    return { ok: false, message: 'Could not open the receipt to send. Please try again.' };
  }

  const receiptLink = await shortenReceiptUrl(signed.signedUrl);
  const url = waShareUrl(
    recipient,
    buildReceiptShareMessage({
      referenceNumber: share.referenceNumber,
      buyerName: share.buyerName,
      destination: share.destination,
      saco: share.saco,
      receiptLink,
    }),
  );

  if (tab && !tab.closed) tab.location.href = url;
  else window.location.href = url;

  trackShareReceiptWhatsApp({
    tracking_code: share.referenceNumber,
    destination: share.destination,
    sacco: share.saco,
  });

  return { ok: true };
}
