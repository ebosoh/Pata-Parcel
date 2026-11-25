import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { suggestedSendingFee, SENDING_METHODS, SACCO_NAMES, BUYER_SACCO_OPTIONS, DELIVERY_SACCO_OPTIONS, PLATFORM_FEE_RATE, computePlatformFee } from './constants';

test('the platform fee is 15% of the total sending fee, rounded to whole shillings', () => {
  assert.equal(PLATFORM_FEE_RATE, 0.15);
  assert.equal(computePlatformFee(150), 23); // 1 pkg at KES 150 -> 22.5 rounds to 23
  assert.equal(computePlatformFee(450), 68); // 3 pkgs at KES 150 -> 67.5 rounds to 68
  assert.equal(computePlatformFee(1000), 150);
});

test('the SACCO picker offers the 44 SACCOs the platform serves', () => {
  assert.equal(SACCO_NAMES.length, 44);
  assert.equal(new Set(SACCO_NAMES).size, 44);
  for (const name of ['Tulaga', 'Ena Coach', 'Kagumo Travellers', 'Chania cool', 'Double M', 'Ganaki', 'Guardian']) {
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

test('sending fees prefill from the method, or the SACCO for PSV', () => {
  assert.equal(suggestedSendingFee('pickup_mtaani'), 140);
  assert.equal(suggestedSendingFee('pata_parcel'), 50);
  assert.equal(suggestedSendingFee('door_to_door'), 100);
  assert.equal(suggestedSendingFee('psv', 'Tulaga'), 200);
  assert.equal(suggestedSendingFee('psv', 'Ena Coach'), 300);
  assert.equal(suggestedSendingFee('psv', 'Chania Genesis'), 350);
  assert.equal(suggestedSendingFee('psv', 'Ganaki'), 100);
  assert.equal(suggestedSendingFee('psv', 'Guardian'), 350);
  assert.equal(suggestedSendingFee('psv', 'The Guardian'), 350);
  assert.equal(suggestedSendingFee('psv', ''), null);
});

test('PSV-Driver sending fee is paid on delivery', () => {
  assert.equal(suggestedSendingFee('psv_driver', 'Tulaga'), 'on_delivery');
});

test('BUYER_SACCO_OPTIONS and DELIVERY_SACCO_OPTIONS include the 5 moved sending methods and all SACCOs', () => {
  assert.equal(DELIVERY_SACCO_OPTIONS, BUYER_SACCO_OPTIONS);
  assert.ok(BUYER_SACCO_OPTIONS.includes('Pick-up Mtaani'));
  assert.ok(BUYER_SACCO_OPTIONS.includes('Pata Parcel (PAP Pick-up Points)'));
  assert.ok(BUYER_SACCO_OPTIONS.includes('Door to Door (Within Nairobi)'));
  assert.ok(BUYER_SACCO_OPTIONS.includes('PSV (SACCO)'));
  assert.ok(BUYER_SACCO_OPTIONS.includes('PSV-Driver'));
  for (const sacco of SACCO_NAMES) {
    assert.ok(BUYER_SACCO_OPTIONS.includes(sacco));
  }
  assert.equal(BUYER_SACCO_OPTIONS.length, 5 + SACCO_NAMES.length);
});
