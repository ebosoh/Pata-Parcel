import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  getSellerDisplayName,
  matchesSellerDirectoryQuery,
  filterSellers,
  sortSellers,
  type SellerProfileItem,
} from './sellerDirectory';

const SAMPLE_SELLERS: SellerProfileItem[] = [
  {
    id: 's1',
    owner_name: 'Alice Wambui',
    business_name: 'Nairobi Kicks',
    phone: '0712345678',
    business_type: 'Shoes & Footwear',
    location: 'CBD, Nairobi',
    order_link_code: 'alice-kicks',
    created_at: '2026-01-10T10:00:00Z',
    totalParcels: 15,
  },
  {
    id: 's2',
    owner_name: 'Brian Otieno',
    business_name: 'Tech Haven',
    phone: '0722334455',
    business_type: 'Electronics & Gadgets',
    location: 'Westlands',
    order_link_code: 'tech-haven',
    created_at: '2026-02-15T12:00:00Z',
    totalParcels: 42,
  },
  {
    id: 's3',
    owner_name: 'Catherine Mutua',
    business_name: null,
    phone: '0733445566',
    business_type: 'Clothing & Apparel',
    location: 'Thika',
    order_link_code: 'cathy-fashion',
    created_at: '2026-03-01T08:00:00Z',
    totalParcels: 0,
  },
];

test('getSellerDisplayName combines business name and owner name appropriately', () => {
  assert.equal(getSellerDisplayName(SAMPLE_SELLERS[0]), 'Nairobi Kicks (Alice Wambui)');
  assert.equal(getSellerDisplayName(SAMPLE_SELLERS[2]), 'Catherine Mutua');
  assert.equal(getSellerDisplayName({ business_name: 'Solo Shop', owner_name: '' }), 'Solo Shop');
  assert.equal(getSellerDisplayName({ business_name: null, owner_name: null }), 'Unnamed Seller');
});

test('matchesSellerDirectoryQuery searches across name, business, phone, location, and code', () => {
  assert.equal(matchesSellerDirectoryQuery(SAMPLE_SELLERS[0], 'nairobi'), true);
  assert.equal(matchesSellerDirectoryQuery(SAMPLE_SELLERS[0], 'alice'), true);
  assert.equal(matchesSellerDirectoryQuery(SAMPLE_SELLERS[0], '0712'), true);
  assert.equal(matchesSellerDirectoryQuery(SAMPLE_SELLERS[1], 'westlands'), true);
  assert.equal(matchesSellerDirectoryQuery(SAMPLE_SELLERS[1], 'tech-haven'), true);
  assert.equal(matchesSellerDirectoryQuery(SAMPLE_SELLERS[0], 'nonexistent'), false);
});

test('filterSellers filters by search, business type, and activity', () => {
  // Filter by business type
  const shoes = filterSellers(SAMPLE_SELLERS, { businessType: 'Shoes & Footwear' });
  assert.equal(shoes.length, 1);
  assert.equal(shoes[0].id, 's1');

  // Filter by active
  const active = filterSellers(SAMPLE_SELLERS, { activity: 'active' });
  assert.equal(active.length, 2);

  // Filter by inactive
  const inactive = filterSellers(SAMPLE_SELLERS, { activity: 'inactive' });
  assert.equal(inactive.length, 1);
  assert.equal(inactive[0].id, 's3');
});

test('sortSellers sorts by name, business, parcel volume, and date', () => {
  const byParcels = sortSellers(SAMPLE_SELLERS, 'parcels_desc');
  assert.deepEqual(byParcels.map(s => s.id), ['s2', 's1', 's3']);

  const byNameAsc = sortSellers(SAMPLE_SELLERS, 'name_asc');
  assert.deepEqual(byNameAsc.map(s => s.id), ['s1', 's2', 's3']);

  const byDateDesc = sortSellers(SAMPLE_SELLERS, 'date_desc');
  assert.deepEqual(byDateDesc.map(s => s.id), ['s3', 's2', 's1']);
});
