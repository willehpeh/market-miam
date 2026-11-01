import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { JWTPayload, JWTVerifyGetKey } from 'jose';
import { OperatorTokenVerifier } from './operator-token-verifier';
import type { VerifiedOperator } from './verified-operator';
import { InvalidTokenError } from './invalid-token.error';
import { NotAnOperatorError } from './not-an-operator.error';

export const OPERATE_PERMISSION = 'operate';

// The operator API has its own Auth0 audience, so a vendor's token fails here on `aud`
// before anything else is read. Auth0 puts the permissions a user's roles grant on the
// API into the token's `permissions` claim (RBAC, with "Add Permissions in the Access
// Token" on).
export class Auth0OperatorTokenVerifier implements OperatorTokenVerifier {
  constructor(
    private readonly issuer: string,
    private readonly audience: string,
    private readonly keys: JWTVerifyGetKey = createRemoteJWKSet(
      new URL(`${issuer}.well-known/jwks.json`),
    ),
  ) {}

  async verify(bearerToken: string): Promise<VerifiedOperator> {
    const payload = await this.verified(bearerToken);
    if (typeof payload.sub !== 'string' || !payload.sub) {
      throw new InvalidTokenError();
    }
    if (!this.mayOperate(payload)) {
      throw new NotAnOperatorError();
    }
    return { operatorId: payload.sub };
  }

  private async verified(bearerToken: string): Promise<JWTPayload> {
    try {
      const { payload } = await jwtVerify(bearerToken, this.keys, {
        issuer: this.issuer,
        audience: this.audience,
        algorithms: ['RS256'],
      });
      return payload;
    } catch {
      throw new InvalidTokenError();
    }
  }

  private mayOperate(payload: JWTPayload): boolean {
    const permissions = payload['permissions'];
    return Array.isArray(permissions) && permissions.includes(OPERATE_PERMISSION);
  }
}
