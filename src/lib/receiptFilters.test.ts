import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  matchesSaccoName,
  getReceiptSellerName,
  sortReceipts,
  matchesSellerQuery,
} from './receiptFilters';

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

test('getReceiptSellerName retrieves business_name or owner_name', () => {
  assert.equal(
    getReceiptSellerName({ created_at: '', parcel: { seller: { business_name: 'Tech Haven' } } }),
    'Tech Haven',
  );
  assert.equal(
    getReceiptSellerName({ created_at: '', parcel: { seller: { owner_name: 'John Doe', business_name: null } } }),
    'John Doe',
  );
  assert.equal(
    getReceiptSellerName({ created_at: '', parcel: null }),
    'Unknown Seller',
  );
});

test('sortReceipts correctly sorts by date ascending and descending', () => {
  const r1 = { created_at: '2026-01-01T10:00:00Z', parcel: { seller: { business_name: 'B Store' } } };
  const r2 = { created_at: '2026-01-02T10:00:00Z', parcel: { seller: { business_name: 'A Store' } } };
  const r3 = { created_at: '2026-01-03T10:00:00Z', parcel: { seller: { business_name: 'C Store' } } };

  const byDateDesc = sortReceipts([r1, r3, r2], 'date_desc');
  assert.deepEqual(byDateDesc.map(r => r.created_at), [
    '2026-01-03T10:00:00Z',
    '2026-01-02T10:00:00Z',
    '2026-01-01T10:00:00Z',
  ]);

  const byDateAsc = sortReceipts([r1, r3, r2], 'date_asc');
  assert.deepEqual(byDateAsc.map(r => r.created_at), [
    '2026-01-01T10:00:00Z',
    '2026-01-02T10:00:00Z',
    '2026-01-03T10:00:00Z',
  ]);
});

test('sortReceipts correctly sorts by seller ascending and descending', () => {
  const r1 = { created_at: '2026-01-01T10:00:00Z', parcel: { seller: { business_name: 'Beta Shoes' } } };
  const r2 = { created_at: '2026-01-02T10:00:00Z', parcel: { seller: { business_name: 'Alpha Electronics' } } };
  const r3 = { created_at: '2026-01-03T10:00:00Z', parcel: { seller: { business_name: 'Gamma Boutique' } } };

  const bySellerAsc = sortReceipts([r1, r3, r2], 'seller_asc');
  assert.deepEqual(bySellerAsc.map(r => r.parcel.seller.business_name), [
    'Alpha Electronics',
    'Beta Shoes',
    'Gamma Boutique',
  ]);

  const bySellerDesc = sortReceipts([r1, r3, r2], 'seller_desc');
  assert.deepEqual(bySellerDesc.map(r => r.parcel.seller.business_name), [
    'Gamma Boutique',
    'Beta Shoes',
    'Alpha Electronics',
  ]);
});

test('matchesSellerQuery matches case-insensitive partial names', () => {
  const r = { created_at: '', parcel: { seller: { business_name: 'Tech Haven Ltd' } } };
  assert.equal(matchesSellerQuery(r, 'tech'), true);
  assert.equal(matchesSellerQuery(r, 'HAVEN'), true);
  assert.equal(matchesSellerQuery(r, 'shoes'), false);
  assert.equal(matchesSellerQuery(r, '   '), true);
});
