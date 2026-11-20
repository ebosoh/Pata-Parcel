// Filtering helpers for the Dispatch Receipts list.

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
