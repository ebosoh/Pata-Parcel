import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { serializePackageTypes, inferPackageTypesFromDescription } from './packageDetails';

test('a parcel preserves more than one selected package type', () => {
  assert.equal(serializePackageTypes(['Clothing', 'Shoes'], ''), 'Clothing, Shoes');
});

test('custom package types are preserved alongside selected categories', () => {
  assert.equal(serializePackageTypes(['Clothing', 'Other'], ' Curtains '), 'Clothing, Curtains');
});

test('an empty package selection cannot produce a valid package type', () => {
  assert.equal(serializePackageTypes([], ''), '');
});

test('infers Clothing from dress, jeans, blouse, and shorts keywords', () => {
  assert.deepEqual(inferPackageTypesFromDescription('Blue mummy jeans and white blouse'), ['Clothing']);
  assert.deepEqual(inferPackageTypesFromDescription('Floral maxi dress'), ['Clothing']);
  assert.deepEqual(inferPackageTypesFromDescription('2 pairs of denim shorts'), ['Clothing']);
});

test('infers each package category accurately from Kenyan product keywords', () => {
  assert.deepEqual(inferPackageTypesFromDescription('Airforce 1 white sneakers size 42'), ['Shoes']);
  assert.deepEqual(inferPackageTypesFromDescription('Nonstick sufuria set and hotpot'), ['Utensils']);
  assert.deepEqual(inferPackageTypesFromDescription('iPhone charger and JBL Bluetooth speaker'), ['Electronics']);
  assert.deepEqual(inferPackageTypesFromDescription('4 seater dining table and coffee table'), ['Furniture']);
  assert.deepEqual(inferPackageTypesFromDescription('Lotion, lip gloss, and human hair wig'), ['Beauty Products']);
  assert.deepEqual(inferPackageTypesFromDescription('Gold necklace and sunglasses'), ['Accessories']);
  assert.deepEqual(inferPackageTypesFromDescription('Leather tote handbag and laptop backpack'), ['Bags']);
  assert.deepEqual(inferPackageTypesFromDescription('2 sheer curtains and a fluffy carpet'), ['Home Decor']);
});

test('infers multiple categories when description contains items from different types', () => {
  assert.deepEqual(
    inferPackageTypesFromDescription('Red dress, heels, and a matching handbag'),
    ['Clothing', 'Shoes', 'Bags'],
  );
});

test('falls back to Other when description is empty or has no matching keywords', () => {
  assert.deepEqual(inferPackageTypesFromDescription(''), ['Other']);
  assert.deepEqual(inferPackageTypesFromDescription('   '), ['Other']);
  assert.deepEqual(inferPackageTypesFromDescription('Mystery parcel box'), ['Other']);
});

test('uses word boundaries and compound exclusions so substrings and qualifiers do not cause false positives', () => {
  // "what" should not match "hat" (Accessories), "cupboard" should match Furniture not "cup" (Utensils)
  assert.deepEqual(inferPackageTypesFromDescription('Wooden cupboard'), ['Furniture']);
  assert.deepEqual(inferPackageTypesFromDescription('What is inside'), ['Other']);
  // "phone case" is Accessories, not Electronics; "laptop bag" is Bags, not Electronics
  assert.deepEqual(inferPackageTypesFromDescription('iPhone case and screen protector'), ['Accessories']);
  assert.deepEqual(inferPackageTypesFromDescription('Laptop bag'), ['Bags']);
});
