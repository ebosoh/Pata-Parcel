import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { matchesComplaintFilter } from './complaints';

test('resolved complaints leave the active list but remain in resolved history', () => {
  assert.deepEqual(
    (['open', 'investigating', 'resolved'] as const).filter(status => matchesComplaintFilter(status, 'active')),
    ['open', 'investigating'],
  );
  assert.equal(matchesComplaintFilter('resolved', 'resolved'), true);
});
import { findFraudSuspects as _ffs } from './complaints';
const mk = (id: string, phone: string) => ({ id, buyer_name: 'Jane', buyer_phone: phone, destination: 'Kisumu', package_type: 'Shoes', created_at: `2026-11-0${id}` });
test('a buyer with exactly 2 complaints is not flagged for fraud', () => {
  assert.equal(_ffs([mk('1', '0712345678'), mk('2', '0712345678')]).length, 0);
});
test('a buyer with 3 complaints is flagged even with different phone formats', () => {
  const r = _ffs([mk('1', '0712345678'), mk('2', '+254712345678'), mk('3', '712 345 678')]);
  assert.equal(r.length, 1);
  assert.equal(r[0]?.complaints.length, 3);
});
