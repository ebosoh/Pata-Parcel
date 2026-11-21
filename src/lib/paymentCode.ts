const REJECTION_PREFIX = 'PAYMENT_REJECTED:';

/** Rejected orders are successful RPC responses so the fraud audit can commit. */
export function paymentCodeRejection(result: unknown): string | null {
  if (typeof result !== 'string' || !result.startsWith(REJECTION_PREFIX)) return null;
  return result.slice(REJECTION_PREFIX.length) || 'Order could not be created';
}