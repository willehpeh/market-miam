import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { FIXED_NOW, fixedClock } from '../../testing/api-test-app';
import { SigningSecret } from './signing-secret';
import { StripeEventDestination } from './stripe-event-destination';

const SECRET = 'whsec_test_accounts';
const ANOTHER_SECRET = 'whsec_test_another_destination';
const BODY = Buffer.from('{\n  "id": "evt_test_1",\n  "object": "v2.core.event"\n}');
const SIX_MINUTES_EARLIER = '2026-06-23T08:54:00.000Z';

describe('A Stripe event destination', () => {
  const destination = new StripeEventDestination(new SigningSecret(SECRET), fixedClock);

  it('takes a body signed with its secret just now as genuine', () => {
    expect(destination.isGenuine(BODY, signatureFor(BODY))).toBe(true);
  });

  it('takes a body as genuine when any of its v1 signatures was made with its secret, as while a secret is rolled', () => {
    const rolling = `t=${timestampOf(FIXED_NOW)},v1=${hmacOf(BODY)},v1=${hmacOf(BODY, { secret: ANOTHER_SECRET })}`;

    expect(destination.isGenuine(BODY, rolling)).toBe(true);
  });

  it('refuses a body signed more than five minutes ago', () => {
    expect(destination.isGenuine(BODY, signatureFor(BODY, { at: SIX_MINUTES_EARLIER }))).toBe(false);
  });

  it('refuses a body changed after it was signed', () => {
    const changed = Buffer.from(BODY.toString().replace('evt_test_1', 'evt_test_2'));

    expect(destination.isGenuine(changed, signatureFor(BODY))).toBe(false);
  });

  it('refuses a body signed with another secret', () => {
    expect(destination.isGenuine(BODY, signatureFor(BODY, { secret: ANOTHER_SECRET }))).toBe(false);
  });

  it('refuses a delivery with no signature header at all', () => {
    expect(destination.isGenuine(BODY, undefined)).toBe(false);
  });

  it('refuses a header with no v1 signature, rather than failing', () => {
    expect(destination.isGenuine(BODY, `t=${timestampOf(FIXED_NOW)}`)).toBe(false);
  });

  it('refuses a body signed only under the v0 scheme', () => {
    expect(destination.isGenuine(BODY, `t=${timestampOf(FIXED_NOW)},v0=${hmacOf(BODY)}`)).toBe(false);
  });
});

function timestampOf(at: string): number {
  return Math.floor(new Date(at).getTime() / 1000);
}

function hmacOf(body: Buffer, { at = FIXED_NOW, secret = SECRET } = {}): string {
  return createHmac('sha256', secret).update(`${timestampOf(at)}.`).update(body).digest('hex');
}

function signatureFor(body: Buffer, { at = FIXED_NOW, secret = SECRET } = {}): string {
  return `t=${timestampOf(at)},v1=${hmacOf(body, { at, secret })}`;
}
