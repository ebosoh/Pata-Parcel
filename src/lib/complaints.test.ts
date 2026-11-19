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