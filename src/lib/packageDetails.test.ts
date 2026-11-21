import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { serializePackageTypes } from './packageDetails';

test('a parcel preserves more than one selected package type', () => {
  assert.equal(serializePackageTypes(['Clothing', 'Shoes'], ''), 'Clothing, Shoes');
});

test('custom package types are preserved alongside selected categories', () => {
  assert.equal(serializePackageTypes(['Clothing', 'Other'], ' Curtains '), 'Clothing, Curtains');
});

test('an empty package selection cannot produce a valid package type', () => {
  assert.equal(serializePackageTypes([], ''), '');
});