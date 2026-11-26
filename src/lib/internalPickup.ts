// Internal pick-up = dispatches created by Pata Parcel staff and collected at the hub.
export const STAFF_SENDING_FEE = 50;
export const INTERNAL_PICKUP_LATE_FEE = 100;
export const INTERNAL_PICKUP_GRACE_DAYS = 3;

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

export function isInternalPickup(parcel: { order_source?: string | null }): boolean {
  return parcel.order_source === 'staff' || parcel.order_source === 'pap_staff';
}

/** Amount owed at collection: KES 50 up to 3 days of stay, KES 100 after that. */
export function internalPickupTotalDue(createdAt: string, now: Date = new Date()): number {
  const stayMs = now.getTime() - new Date(createdAt).getTime();
  return stayMs > INTERNAL_PICKUP_GRACE_DAYS * DAY_MS ? INTERNAL_PICKUP_LATE_FEE : STAFF_SENDING_FEE;
}

/** How long the dispatch has stayed, in hours under a day and in days after. */
export function formatStay(createdAt: string, now: Date = new Date()): string {
  const stayMs = Math.max(0, now.getTime() - new Date(createdAt).getTime());
  if (stayMs < HOUR_MS) return 'Under 1 hr';
  if (stayMs < DAY_MS) {
    const hrs = Math.floor(stayMs / HOUR_MS);
    return `${hrs} hr${hrs === 1 ? '' : 's'}`;
  }
  const days = Math.floor(stayMs / DAY_MS);
  const hrs = Math.floor((stayMs % DAY_MS) / HOUR_MS);
  return `${days} day${days === 1 ? '' : 's'}${hrs ? ` ${hrs} hr${hrs === 1 ? '' : 's'}` : ''}`;
}
