import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { readFile, writeFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import { paymentCodeRejection } from './paymentCode';

// Opt-in against a temporary, confirmed seller; never use a production user's session.
test('payment codes are single-use; first reuse warns, second blacklists, distinct codes allow repeat purchases', {
  skip: !process.env['PAYMENT_TEST_SESSION_FILE'],
}, async () => {
  const sessionFile = process.env['PAYMENT_TEST_SESSION_FILE'];
  const url = process.env['VITE_SUPABASE_URL'];
  const key = process.env['VITE_SUPABASE_PUBLISHABLE_KEY'];
  if (!sessionFile || !url || !key) throw new Error('Temporary test session and Cloud configuration required');
  const minted = JSON.parse(await readFile(sessionFile, 'utf8'));
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  await client.auth.setSession(minted.session);
  const profile = await client.from('profiles').select('order_link_code').eq('id', minted.session.user.id).single();
  assert.equal(profile.error, null);
  const suffix = String(Date.now()).slice(-10);
  const phone = `07000${suffix.slice(-5)}`;
  const otherPhone = `01000${suffix.slice(-5)}`;
  const codes = [`FT${suffix}A`, `FT${suffix}B`, `FT${suffix}C`];
  await writeFile('/tmp/payment-fraud-test-data.json', JSON.stringify({ phones: [phone.slice(-9), otherPhone.slice(-9)], codes, seller: minted.session.user.id }));
  const input = { buyer_name: 'Payment Fraud Test', buyer_phone: phone, destination: 'Nairobi', sending_method: 'pickup_mtaani', package_type: 'Clothing', sending_fee: 140, goods_amount: 500, payment_code: codes[0] };
  const buyerOrder = async (buyerPhone: string, code: string) => {
    const result = await client.rpc('submit_buyer_order', {
      _code: profile.data.order_link_code, _buyer_name: input.buyer_name, _buyer_phone: buyerPhone,
      _destination: 'Nairobi', _sending_method: 'pickup_mtaani', _psv_sacco: '', _pick_point: '',
      _package_type: 'Clothing', _package_description: '', _sending_fee: 140, _goods_amount: 500, _payment_code: code,
    });
    assert.equal(result.error, null);
    return result.data;
  };
  const firstCode = codes[0]; const secondCode = codes[1]; const thirdCode = codes[2];
  if (!firstCode || !secondCode || !thirdCode) throw new Error('Missing test codes');
  const first = await client.rpc('seller_create_parcel', { _input: input });
  assert.equal(first.error, null);
  assert.ok(first.data?.parcel?.id, 'first use creates an order');
  const repeatPurchase = await buyerOrder(phone, secondCode);
  assert.equal(paymentCodeRejection(repeatPurchase), null, 'same phone can buy again with a distinct code');
  const warning = paymentCodeRejection(await buyerOrder(otherPhone, ` ${firstCode.toLowerCase()} `));
  assert.ok(warning?.includes('already used'), 'case and whitespace cannot bypass global reuse prevention');
  assert.ok(warning?.includes('Another reuse attempt'), 'first duplicate warns, without blacklisting yet');
  const secondReuse = await client.rpc('seller_create_parcel', { _input: { ...input, buyer_phone: `+254${otherPhone.slice(1)}`, payment_code: secondCode } });
  assert.equal(secondReuse.error, null);
  assert.ok(secondReuse.data?.error?.includes('now blacklisted'), 'second duplicate, even a different code and phone format, blacklists');
  const blocked = paymentCodeRejection(await buyerOrder(otherPhone, thirdCode));
  assert.ok(blocked?.includes('blacklisted'), 'blacklisting prevents even a new unique code');
  const orders = await client.from('parcels').select('id').eq('seller_id', minted.session.user.id).in('payment_code', codes);
  assert.equal(orders.error, null);
  assert.equal(orders.data?.length, 2, 'rejected requests never create parcels');
  const fraudRows = await client.from('payment_fraud_phones').select('*');
  assert.equal(fraudRows.error, null);
  assert.equal(fraudRows.data?.length, 0, 'ordinary sellers cannot read fraud phone records');
  const unauthenticated = createClient(url, key, { auth: { persistSession: false } });
  const unauthorized = await unauthenticated.rpc('seller_create_parcel', { _input: input });
  assert.ok(unauthorized.error, 'public callers cannot create seller dispatches');
});