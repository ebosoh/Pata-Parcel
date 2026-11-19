import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { SENDING_METHODS } from './constants';

test('PSV-Driver is offered as a sending method on the dispatch form', () => {
  assert.ok(SENDING_METHODS.some((m) => m.value === 'psv_driver'));
});

test('PSV (SACCO) stays a separate sending method from PSV-Driver', () => {
  const values = SENDING_METHODS.map((m) => m.value);
  assert.ok(values.includes('psv'));
  assert.notEqual(values.indexOf('psv'), values.indexOf('psv_driver'));
});
