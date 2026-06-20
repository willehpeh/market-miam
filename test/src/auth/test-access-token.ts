export const ISSUER = 'https://marketmiam.eu.auth0.com/';
export const AUDIENCE = 'https://api.market-monster';
export const VENDOR_ID = 'b8c9d0e1-2f34-4a56-8b90-1c2d3e4f5a6b';
export const EMAIL = 'vendor@domain.com';

export interface AccessTokenClaims {
  issuer: string;
  audience: string;
  vendorId?: string;
  email?: string;
  expiresAt: number | string;
}

export class TestAccessToken {
  static valid(): AccessTokenClaims {
    return {
      issuer: ISSUER,
      audience: AUDIENCE,
      vendorId: VENDOR_ID,
      email: EMAIL,
      expiresAt: '2h',
    };
  }

  static with(overrides: Partial<AccessTokenClaims>): AccessTokenClaims {
    return { ...this.valid(), ...overrides };
  }
}
