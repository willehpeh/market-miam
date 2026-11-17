import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { Signature } from './signature';
import { SigningSecret } from './signing-secret';

const SECRET = 'whsec_test_accounts';
const SIGNED_PAYLOAD = Buffer.from('1782205200.{"id":"evt_test_1"}');

describe('A signing secret', () => {
  it('signs a payload with HMAC-SHA256, as Stripe does', () => {
    const stripes = createHmac('sha256', SECRET).update(SIGNED_PAYLOAD).digest('hex');

    expect(new SigningSecret(SECRET).sign(SIGNED_PAYLOAD).matches(Signature.fromHex(stripes))).toBe(true);
  });

  it('offers nothing but signing', () => {
    expect(Object.getOwnPropertyNames(SigningSecret.prototype)).toEqual(['constructor', 'sign']);
  });

  it('gives nothing away when serialized', () => {
    expect(JSON.stringify(new SigningSecret(SECRET))).toBe('{}');
  });
});
