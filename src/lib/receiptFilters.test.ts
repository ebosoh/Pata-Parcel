import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { matchesSaccoName } from './receiptFilters';

test('an empty SACCO search term keeps every parcel', () => {
  assert.equal(matchesSaccoName('Ena Coach', ''), true);
  assert.equal(matchesSaccoName(null, '   '), true);
});

test('the SACCO search term matches partial names in any letter case', () => {
  assert.equal(matchesSaccoName('Ena Coach', 'ena'), true);
  assert.equal(matchesSaccoName('ENA COACH', 'ena coa'), true);
  assert.equal(matchesSaccoName('Kagumo Travellers', 'travellers'), true);
});

test('a parcel with no SACCO recorded is dropped once a term is typed', () => {
  assert.equal(matchesSaccoName(null, 'ena'), false);
  assert.equal(matchesSaccoName('', 'ena'), false);
});

test('the SACCO search term does not match unrelated SACCOs', () => {
  assert.equal(matchesSaccoName('Double M', 'tulaga'), false);
  assert.equal(matchesSaccoName('Nawaku', 'naekena'), false);
});
