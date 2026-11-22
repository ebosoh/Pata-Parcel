import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { buildReceiptShareMessage, waRecipientFor, waShareUrl, shortenReceiptUrl } from './receiptSharing';

test('a 07 or 01 buyer number becomes a 254 WhatsApp number', () => {
  assert.equal(waRecipientFor('0712345678'), '254712345678');
  assert.equal(waRecipientFor('0112345678'), '254112345678');
  assert.equal(waRecipientFor('+254 712 345 678'), '254712345678');
  assert.equal(waRecipientFor('254712345678'), '254712345678');
});

test('numbers WhatsApp cannot reach are refused instead of sent to', () => {
  assert.equal(waRecipientFor(''), null);
  assert.equal(waRecipientFor('0202222222'), null); // landline
  assert.equal(waRecipientFor('071234'), null); // too short
  assert.equal(waRecipientFor('0999999999'), null); // not a Kenyan prefix
});

test('the receipt message carries the tracking code, buyer, destination and receipt link', () => {
  const message = buildReceiptShareMessage({
    referenceNumber: 'HudsonEboso-012548',
    buyerName: 'Jane Wanjiku',
    destination: 'Kisumu',
    saco: 'Ena Coach',
    receiptLink: 'https://example.test/receipt.jpg',
  });
  assert.match(message, /HudsonEboso-012548/);
  assert.match(message, /Jane Wanjiku/);
  assert.match(message, /Kisumu/);
  assert.match(message, /Ena Coach/);
  assert.match(message, /https:\/\/example\.test\/receipt\.jpg/);
});

test('the SACCO line is left out when the seller did not give one', () => {
  const message = buildReceiptShareMessage({
    referenceNumber: 'HudsonEboso-012548',
    buyerName: 'Jane Wanjiku',
    destination: 'Nyeri',
    saco: '   ',
    receiptLink: 'https://example.test/receipt.jpg',
  });
  assert.ok(!message.includes('SACCO'));
});

test('the wa.me link carries the buyer number and an encoded message', () => {
  const url = waShareUrl('254712345678', 'Receipt: https://example.test/r.jpg');
  assert.ok(url.startsWith('https://wa.me/254712345678?text='));
  assert.ok(url.includes('https%3A%2F%2Fexample.test%2Fr.jpg'));
});

test('shortenReceiptUrl shortens a long URL or falls back safely', async () => {
  const short = await shortenReceiptUrl('https://example.com/very/long/path/with/a/lot/of/query/parameters/and/tokens/so/it/exceeds/fifty/characters?token=abcdef1234567890');
  assert.ok(typeof short === 'string');
  assert.ok(short.startsWith('http'));
});
