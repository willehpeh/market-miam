import { OperatorTokenVerifier } from './operator-token-verifier';
import type { VerifiedOperator } from './verified-operator';

// Dev-only stand-in for Auth0 on the operator API: any bearer token signs you in as
// the development operator. Safe only because this verifier is constructed solely
// when NODE_ENV=development (see operatorTokenVerifierFor) — production always
// verifies a real Auth0 signature and the `operate` permission.
export const DEV_OPERATOR_ID = 'dev-operator';

export class DevelopmentOperatorTokenVerifier extends OperatorTokenVerifier {
  verify(): Promise<VerifiedOperator> {
    return Promise.resolve({ operatorId: DEV_OPERATOR_ID });
  }
}
