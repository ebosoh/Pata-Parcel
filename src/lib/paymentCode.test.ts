import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { paymentCodeRejection } from './paymentCode';

test('a rejected payment cannot be treated as an order tracking code', () => {
  assert.equal(paymentCodeRejection('PAYMENT_REJECTED:duplicate'), 'duplicate');
  assert.equal(paymentCodeRejection('HudsonEboso-012548'), null);
  assert.equal(paymentCodeRejection(null), null);
});