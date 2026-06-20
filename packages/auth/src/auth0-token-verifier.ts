import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { JWTPayload, JWTVerifyGetKey } from 'jose';
import { Email } from '@market-monster/common';
import { VendorId } from '@market-monster/shared-kernel';
import { TokenVerifier } from './token-verifier';
import { VerifiedVendor } from './verified-vendor';
import { InvalidTokenError } from './invalid-token.error';

const VENDOR_ID_CLAIM = 'https://marketmiam/vendorId';
const EMAIL_CLAIM = 'https://marketmiam/email';

export class Auth0TokenVerifier implements TokenVerifier {
  constructor(
    private readonly issuer: string,
    private readonly audience: string,
    private readonly keys: JWTVerifyGetKey = createRemoteJWKSet(
      new URL(`${issuer}.well-known/jwks.json`),
    ),
  ) {}

  async verify(bearerToken: string): Promise<VerifiedVendor> {
    try {
      const { payload } = await jwtVerify(bearerToken, this.keys, {
        issuer: this.issuer,
        audience: this.audience,
        algorithms: ['RS256'],
      });
      return {
        vendorId: new VendorId(this.claim(payload, VENDOR_ID_CLAIM)),
        email: new Email(this.claim(payload, EMAIL_CLAIM)),
      };
    } catch {
      throw new InvalidTokenError();
    }
  }

  private claim(payload: JWTPayload, name: string): string {
    const value = payload[name];
    return typeof value === 'string' ? value : '';
  }
}
