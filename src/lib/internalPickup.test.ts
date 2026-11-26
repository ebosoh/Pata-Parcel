import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { STAFF_SENDING_FEE, formatStay, internalPickupTotalDue, isInternalPickup } from './internalPickup';

const now = new Date('2026-11-26T12:00:00Z');
const ago = (hours: number) => new Date(now.getTime() - hours * 3_600_000).toISOString();

test('staff dispatches prefill a sending fee of KES 50', () => {
  assert.equal(STAFF_SENDING_FEE, 50);
});

test('total due is KES 50 for a stay of less than 3 days', () => {
  assert.equal(internalPickupTotalDue(ago(2), now), 50);
  assert.equal(internalPickupTotalDue(ago(71), now), 50);
});

test('total due is KES 100 for a stay of more than 3 days', () => {
  assert.equal(internalPickupTotalDue(ago(73), now), 100);
  assert.equal(internalPickupTotalDue(ago(24 * 10), now), 100);
});

test('stay is shown in hours under a day and in days after', () => {
  assert.equal(formatStay(ago(5), now), '5 hrs');
  assert.equal(formatStay(ago(24 * 4), now), '4 days');
  assert.equal(formatStay(ago(24 * 2 + 3), now), '2 days 3 hrs');
});

test('only staff-created dispatches count as internal pick-up', () => {
  assert.equal(isInternalPickup({ order_source: 'staff' }), true);
  assert.equal(isInternalPickup({ order_source: 'seller' }), false);
  assert.equal(isInternalPickup({ order_source: 'buyer_link' }), false);
});
