import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { deferredAuthUpdate, signupOutcome } from './authFlow';

test('a signup with a session never asks for email confirmation again', () => {
  assert.equal(signupOutcome({ session: { user: { id: 'confirmed-user' } }, user: { identities: [{}] } }), 'signed-in');
});

test('a confirmed existing account response leads to sign in, not another confirmation prompt', () => {
  assert.equal(signupOutcome({ session: null, user: { identities: [] } }), 'existing-account');
});

test('a new account without a session still requires its first email confirmation', () => {
  assert.equal(signupOutcome({ session: null, user: { identities: [{}] } }), 'confirmation-required');
});

test('an incomplete signup is not reported as a confirmation email being sent', () => {
  assert.equal(signupOutcome({ session: null, user: null }), 'incomplete');
});

test('profile reads run only after the auth callback releases its session lock', async () => {
  let lockHeld = true;
  let callbackRan = false;
  const update = deferredAuthUpdate(async () => {
    callbackRan = true;
    assert.equal(lockHeld, false);
  });
  update.schedule('confirmed-session');
  lockHeld = false;
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(callbackRan, true);
  update.dispose();
});

test('a newer auth event supersedes older session work', async () => {
  const applied: string[] = [];
  const update = deferredAuthUpdate<string>(async (value, isCurrent) => {
    await new Promise(resolve => setTimeout(resolve, value === 'old-session' ? 25 : 0));
    if (isCurrent()) applied.push(value);
  });
  update.schedule('old-session');
  await new Promise(resolve => setTimeout(resolve, 5));
  update.schedule('confirmed-session');
  await new Promise(resolve => setTimeout(resolve, 40));
  assert.deepEqual(applied, ['confirmed-session']);
  update.dispose();
});

test('leaving the login page cancels pending session updates', async () => {
  const applied: string[] = [];
  const update = deferredAuthUpdate<string>(async value => { applied.push(value); });
  update.schedule('confirmed-session');
  update.dispose();
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.deepEqual(applied, []);
});