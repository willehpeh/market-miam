import { describe, expect, it } from 'vitest';
import { FIXED_NOW, fixedClock } from '../../testing/api-test-app';
import { StripeSigning } from '../../testing/stripe-signing';
import { SigningSecret } from './signing-secret';
import { StripeEventDestination } from './stripe-event-destination';

const SECRET = 'whsec_test_accounts';
const ANOTHER_SECRET = 'whsec_test_another_destination';
const BODY = Buffer.from('{\n  "id": "evt_test_1",\n  "object": "v2.core.event"\n}');
const SIX_MINUTES_EARLIER = '2026-06-23T08:54:00.000Z';

describe('A Stripe event destination', () => {
  const destination = new StripeEventDestination(new SigningSecret(SECRET), fixedClock);
  const signedNow = new StripeSigning(SECRET, FIXED_NOW);

  it('takes a body signed with its secret just now as genuine', () => {
    expect(destination.isGenuine(BODY, signedNow.header(BODY))).toBe(true);
  });

  it('takes a body as genuine when any of its v1 signatures was made with its secret, as while a secret is rolled', () => {
    const signedElsewhere = new StripeSigning(ANOTHER_SECRET, FIXED_NOW);
    const rolling = `t=${signedNow.timestamp()},v1=${signedNow.signatureOf(BODY)},v1=${signedElsewhere.signatureOf(BODY)}`;

    expect(destination.isGenuine(BODY, rolling)).toBe(true);
  });

  it('refuses a body signed more than five minutes ago', () => {
    expect(destination.isGenuine(BODY, new StripeSigning(SECRET, SIX_MINUTES_EARLIER).header(BODY))).toBe(false);
  });

  it('refuses a body changed after it was signed', () => {
    const changed = Buffer.from(BODY.toString().replace('evt_test_1', 'evt_test_2'));

    expect(destination.isGenuine(changed, signedNow.header(BODY))).toBe(false);
  });

  it('refuses a body signed with another secret', () => {
    expect(destination.isGenuine(BODY, new StripeSigning(ANOTHER_SECRET, FIXED_NOW).header(BODY))).toBe(false);
  });

  it('refuses a delivery with no signature header at all', () => {
    expect(destination.isGenuine(BODY, undefined)).toBe(false);
  });

  it('refuses a header with no v1 signature, rather than failing', () => {
    expect(destination.isGenuine(BODY, `t=${signedNow.timestamp()}`)).toBe(false);
  });

  it('refuses a body signed only under the v0 scheme', () => {
    expect(destination.isGenuine(BODY, `t=${signedNow.timestamp()},v0=${signedNow.signatureOf(BODY)}`)).toBe(false);
  });
});
