// Filtering and sorting helpers for the Dispatch Receipts list.

export type ReceiptSortOption =
  | 'date_desc'
  | 'date_asc'
  | 'seller_asc'
  | 'seller_desc';

export interface ReceiptWithSellerLike {
  created_at: string;
  parcel?: {
    seller?: {
      business_name?: string | null;
      owner_name?: string | null;
    } | null;
    buyer_name?: string | null;
  } | null;
}

/**
 * Extracts a display name for the seller from a receipt's parcel profile.
 */
export function getReceiptSellerName(receipt: ReceiptWithSellerLike): string {
  return (
    receipt.parcel?.seller?.business_name?.trim() ||
    receipt.parcel?.seller?.owner_name?.trim() ||
    'Unknown Seller'
  );
}

/**
 * Sorts receipts by date (newest or oldest) or by seller business/owner name (A-Z or Z-A).
 */
export function sortReceipts<T extends ReceiptWithSellerLike>(
  receipts: T[],
  sortBy: ReceiptSortOption,
): T[] {
  return [...receipts].sort((a, b) => {
    if (sortBy === 'date_desc') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    if (sortBy === 'date_asc') {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
    const sellerA = getReceiptSellerName(a).toLowerCase();
    const sellerB = getReceiptSellerName(b).toLowerCase();
    if (sortBy === 'seller_asc') {
      return sellerA.localeCompare(sellerB);
    }
    if (sortBy === 'seller_desc') {
      return sellerB.localeCompare(sellerA);
    }
    return 0;
  });
}

/**
 * Filters receipts by a seller name search query.
 */
export function matchesSellerQuery(receipt: ReceiptWithSellerLike, query: string): boolean {
  const clean = query.trim().toLowerCase();
  if (!clean) return true;
  const seller = getReceiptSellerName(receipt).toLowerCase();
  return seller.includes(clean);
}

/**
 * True when `saccoName` matches the typed search term (case-insensitive,
 * ignores surrounding spaces). An empty query matches everything, and a
 * parcel with no SACCO recorded never matches a typed term.
 */
export function matchesSaccoName(saccoName: string | null | undefined, query: string): boolean {
  const clean = query.trim().toLowerCase();
  if (!clean) return true;
  const name = (saccoName ?? '').trim().toLowerCase();
  if (!name) return false;
  return name.includes(clean);
}
