declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Pushes an event to Google Tag Manager's dataLayer and calls gtag if present.
 */
export function trackEvent(eventName: string, params: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return;

  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: eventName,
      timestamp: new Date().toISOString(),
      ...params,
    });

    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, params);
    }
  } catch (err) {
    console.warn('[Analytics] Failed to track event:', eventName, err);
  }
}

/** Buyer submits an order on a seller's shop link */
export function trackBuyerOrderSubmit(params: {
  destination: string;
  sending_method: string;
  package_type: string;
  goods_amount?: number | null;
  sending_fee?: number | null;
}) {
  trackEvent('buyer_order_submit', {
    destination: params.destination,
    sending_method: params.sending_method,
    package_type: params.package_type,
    goods_amount: params.goods_amount ?? undefined,
    sending_fee: params.sending_fee ?? undefined,
    value: (params.goods_amount ?? 0) + (params.sending_fee ?? 0),
    currency: 'KES',
  });
}

/** Seller dispatches a new parcel from their dashboard */
export function trackSellerCreateDispatch(params: {
  destination: string;
  sending_method: string;
  package_type: string;
  sending_fee?: number | null;
  goods_amount?: number | null;
}) {
  trackEvent('seller_create_dispatch', {
    destination: params.destination,
    sending_method: params.sending_method,
    package_type: params.package_type,
    sending_fee: params.sending_fee ?? undefined,
    goods_amount: params.goods_amount ?? undefined,
  });
}

/** Seller copies their shareable shop order link */
export function trackSellerCopyOrderLink(params?: { source?: string }) {
  trackEvent('seller_copy_order_link', {
    source: params?.source || 'seller_dashboard',
  });
}

/** Seller shares tracking / courier receipt via WhatsApp */
export function trackShareReceiptWhatsApp(params: {
  tracking_code: string;
  destination?: string | null;
  sacco?: string | null;
}) {
  trackEvent('share_receipt_whatsapp', {
    tracking_code: params.tracking_code,
    destination: params.destination ?? undefined,
    sacco: params.sacco ?? undefined,
  });
}

/** User looks up or views a parcel tracking code */
export function trackParcelTrackSearch(params: {
  tracking_code: string;
  source?: string;
  status?: string | null;
}) {
  trackEvent('parcel_track_search', {
    tracking_code: params.tracking_code,
    source: params.source || 'tracking_page',
    tracking_status: params.status ?? undefined,
  });
}

/** User signs up */
export function trackUserSignUp(method: 'email' | 'phone') {
  trackEvent('sign_up', { method });
}

/** User signs in */
export function trackUserLogin(method: 'email' | 'phone') {
  trackEvent('login', { method });
}
