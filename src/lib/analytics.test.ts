import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  trackEvent,
  trackBuyerOrderSubmit,
  trackSellerCreateDispatch,
  trackSellerCopyOrderLink,
  trackShareReceiptWhatsApp,
  trackParcelTrackSearch,
  trackUserSignUp,
  trackUserLogin,
} from './analytics';

function withMockWindow(fn: (dataLayer: Record<string, unknown>[], gtagCalls: unknown[][]) => void) {
  const originalWindow = (globalThis as any).window;
  const dataLayer: Record<string, unknown>[] = [];
  const gtagCalls: unknown[][] = [];

  (globalThis as any).window = {
    dataLayer,
    gtag: (...args: unknown[]) => {
      gtagCalls.push(args);
    },
  };

  try {
    fn(dataLayer, gtagCalls);
  } finally {
    if (originalWindow === undefined) {
      delete (globalThis as any).window;
    } else {
      (globalThis as any).window = originalWindow;
    }
  }
}

test('trackEvent is a no-op when window is undefined (SSR)', () => {
  const originalWindow = (globalThis as any).window;
  delete (globalThis as any).window;
  try {
    assert.doesNotThrow(() => {
      trackEvent('test_event', { foo: 'bar' });
    });
  } finally {
    if (originalWindow !== undefined) {
      (globalThis as any).window = originalWindow;
    }
  }
});

test('trackEvent pushes to dataLayer and calls gtag', () => {
  withMockWindow((dataLayer, gtagCalls) => {
    trackEvent('custom_event', { plan: 'pro' });
    assert.equal(dataLayer.length, 1);
    assert.equal(dataLayer[0]?.['event'], 'custom_event');
    assert.equal(dataLayer[0]?.['plan'], 'pro');
    assert.ok(typeof dataLayer[0]?.['timestamp'] === 'string');

    assert.equal(gtagCalls.length, 1);
    assert.deepEqual(gtagCalls[0], ['event', 'custom_event', { plan: 'pro' }]);
  });
});

test('trackBuyerOrderSubmit calculates total KES value', () => {
  withMockWindow((dataLayer) => {
    trackBuyerOrderSubmit({
      destination: 'Nakuru',
      sending_method: 'pickup_mtaani',
      package_type: 'Clothing',
      goods_amount: 1500,
      sending_fee: 140,
    });
    assert.equal(dataLayer[0]?.['event'], 'buyer_order_submit');
    assert.equal(dataLayer[0]?.['destination'], 'Nakuru');
    assert.equal(dataLayer[0]?.['value'], 1640);
    assert.equal(dataLayer[0]?.['currency'], 'KES');
  });
});

test('all key funnel event helpers emit expected event names', () => {
  withMockWindow((dataLayer) => {
    trackSellerCreateDispatch({
      destination: 'Mombasa',
      sending_method: 'psv',
      package_type: 'Shoes',
      sending_fee: 300,
      goods_amount: null,
    });
    trackSellerCopyOrderLink({ source: 'order_link_card_copy' });
    trackShareReceiptWhatsApp({ tracking_code: 'PAP-123', destination: 'Eldoret', sacco: '2NK' });
    trackParcelTrackSearch({ tracking_code: 'PAP-123', status: 'in_transit' });
    trackUserSignUp('email');
    trackUserLogin('phone');

    assert.deepEqual(
      dataLayer.map((entry) => entry['event']),
      [
        'seller_create_dispatch',
        'seller_copy_order_link',
        'share_receipt_whatsapp',
        'parcel_track_search',
        'sign_up',
        'login',
      ],
    );
  });
});
