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

/**
 * Shortens a long receipt link via TinyURL (with is.gd fallback)
 * so it remains neat and legible in WhatsApp.
 * Falls back to the original link if shortener is unavailable.
 */
export async function shortenReceiptUrl(longUrl: string): Promise<string> {
  if (!longUrl || longUrl.length < 50) return longUrl;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`, {
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.ok) {
      const short = (await res.text()).trim();
      if (short.startsWith('http://') || short.startsWith('https://')) {
        return short;
      }
    }
  } catch {
    // Fall back to is.gd if TinyURL fails or times out
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);

      const res = await fetch(`https://is.gd/create.php?format=simple&url=${encodeURIComponent(longUrl)}`, {
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (res.ok) {
        const short = (await res.text()).trim();
        if (short.startsWith('http://') || short.startsWith('https://')) {
          return short;
        }
      }
    } catch {
      // Ignore fallback failure
    }
  }

  return longUrl;
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
    `Hello ${buyerName || 'Customer'}, here is your Pata Parcel dispatch receipt!`,
    `Tracking Code: ${referenceNumber}`,
    `Buyer: ${buyerName}`,
    `To: ${destination}`,
  ];
  if (saco && saco.trim()) lines.push(`SACCO: ${saco.trim()}`);
  lines.push(`Receipt: ${receiptLink}`);
  lines.push(`Thank you for using Pata Parcel!`);
  return lines.join('\n');
}

/** wa.me link that opens a chat with the buyer and the receipt message typed in. */
export function waShareUrl(recipientDigits: string, message: string): string {
  return `https://wa.me/${recipientDigits}?text=${encodeURIComponent(message)}`;
}
