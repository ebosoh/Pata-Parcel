import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { SENDING_METHODS, SACCO_NAMES } from './constants';

test('the SACCO picker offers the 42 SACCOs the platform serves', () => {
  assert.equal(SACCO_NAMES.length, 42);
  assert.equal(new Set(SACCO_NAMES).size, 42);
  for (const name of ['Tulaga', 'Ena Coach', 'Kagumo Travellers', 'Chania cool', 'Double M']) {
    assert.ok(SACCO_NAMES.includes(name as (typeof SACCO_NAMES)[number]), `missing ${name}`);
  }
});

test('PSV-Driver is offered as a sending method on the dispatch form', () => {
  assert.ok(SENDING_METHODS.some((m) => m.value === 'psv_driver'));
});

test('PSV (SACCO) stays a separate sending method from PSV-Driver', () => {
  const values = SENDING_METHODS.map((m) => m.value);
  assert.ok(values.includes('psv'));
  assert.notEqual(values.indexOf('psv'), values.indexOf('psv_driver'));
});
