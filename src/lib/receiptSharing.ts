import { normalizeBuyerPhone } from '@/lib/complaints';

/**
 * The buyer's number in the form WhatsApp links need (254XXXXXXXXX), or null
 * when the stored number cannot be reached on WhatsApp.
 */
export function waRecipientFor(phone: string): string | null {
  const local = normalizeBuyerPhone(phone);
  const digits = local ? `254${local}` : '';
  return /^254(1|7)\d{8}$/.test(digits) ? digits : null;
}

export interface ReceiptShareDetails {
  referenceNumber: string;
  buyerName: string;
  destination: string;
  saco?: string | null | undefined;
  receiptLink: string;
}

/** The message body that goes to the buyer together with the receipt copy. */
export function buildReceiptShareMessage({
  referenceNumber,
  buyerName,
  destination,
  saco,
  receiptLink,
}: ReceiptShareDetails): string {
  const lines = [
    `Pata Parcel receipt - ${referenceNumber}`,
    `Buyer: ${buyerName}`,
    `To: ${destination}`,
  ];
  if (saco && saco.trim()) lines.push(`SACCO: ${saco.trim()}`);
  lines.push(`Receipt: ${receiptLink}`);
  return lines.join('\n');
}

/** wa.me link that opens a chat with the buyer and the receipt message typed in. */
export function waShareUrl(recipientDigits: string, message: string): string {
  return `https://wa.me/${recipientDigits}?text=${encodeURIComponent(message)}`;
}
