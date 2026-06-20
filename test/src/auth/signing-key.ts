import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import type { CryptoKey, JWTVerifyGetKey } from 'jose';
import { AccessTokenClaims } from './test-access-token';

const VENDOR_ID_CLAIM = 'https://marketmiam/vendorId';
const EMAIL_CLAIM = 'https://marketmiam/email';

/**
 * Fakes the Auth0 signing side at the JWKS boundary: holds a generated RS256
 * key pair, exposes its public half as a local JWKS the verifier can resolve,
 * and signs access tokens with the private half.
 */
export class SigningKey {
  private constructor(
    private readonly privateKey: CryptoKey,
    private readonly resolver: JWTVerifyGetKey,
    private readonly kid: string,
  ) {}

  static async generate(kid = 'test-key'): Promise<SigningKey> {
    const { publicKey, privateKey } = await generateKeyPair('RS256');
    const jwk = { ...(await exportJWK(publicKey)), kid, alg: 'RS256', use: 'sig' };
    return new SigningKey(privateKey, createLocalJWKSet({ keys: [jwk] }), kid);
  }

  jwks(): JWTVerifyGetKey {
    return this.resolver;
  }

  async sign(claims: AccessTokenClaims): Promise<string> {
    return new SignJWT({
      [VENDOR_ID_CLAIM]: claims.vendorId,
      [EMAIL_CLAIM]: claims.email,
    })
      .setProtectedHeader({ alg: 'RS256', kid: this.kid })
      .setIssuer(claims.issuer)
      .setAudience(claims.audience)
      .setIssuedAt()
      .setExpirationTime(claims.expiresAt)
      .sign(this.privateKey);
  }
}
