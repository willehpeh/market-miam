export const OPS_ISSUER = 'https://marketmiam.eu.auth0.com/';
export const OPS_AUDIENCE = 'https://api.market-miam/ops';
export const OPERATOR_ID = 'github|1234567';

export interface OperatorTokenClaims {
  issuer: string;
  audience: string;
  subject?: string;
  permissions?: unknown;
  expiresAt: number | string;
}

export class TestOperatorToken {
  static valid(): OperatorTokenClaims {
    return {
      issuer: OPS_ISSUER,
      audience: OPS_AUDIENCE,
      subject: OPERATOR_ID,
      permissions: ['operate'],
      expiresAt: '1h',
    };
  }

  static with(overrides: Partial<OperatorTokenClaims>): OperatorTokenClaims {
    return { ...this.valid(), ...overrides };
  }
}
