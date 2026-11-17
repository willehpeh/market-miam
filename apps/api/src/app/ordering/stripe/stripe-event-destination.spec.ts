import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { FIXED_NOW, fixedClock } from '../../testing/api-test-app';
import { StripeEventDestination } from './stripe-event-destination';

const SECRET = 'whsec_test_accounts';
const BODY = Buffer.from('{\n  "id": "evt_test_1",\n  "object": "v2.core.event"\n}');
const SIX_MINUTES_EARLIER = '2026-06-23T08:54:00.000Z';

describe('A Stripe event destination', () => {
  const destination = new StripeEventDestination(SECRET, fixedClock);

  it('takes a body signed with its secret just now as genuine', () => {
    expect(destination.isGenuine(BODY, signatureFor(BODY))).toBe(true);
  });

  it('refuses a body signed more than five minutes ago', () => {
    expect(destination.isGenuine(BODY, signatureFor(BODY, SIX_MINUTES_EARLIER))).toBe(false);
  });
});

function signatureFor(body: Buffer, at = FIXED_NOW): string {
  const timestamp = Math.floor(new Date(at).getTime() / 1000);
  const signature = createHmac('sha256', SECRET).update(`${timestamp}.`).update(body).digest('hex');
  return `t=${timestamp},v1=${signature}`;
}
