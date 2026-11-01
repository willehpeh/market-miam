import {
  InvalidTokenError,
  NotAnOperatorError,
  OperatorTokenVerifier,
  type VerifiedOperator,
} from '@market-miam/auth';

export const testOperator: VerifiedOperator = { operatorId: 'github|1234567' };
export const OPERATOR_TOKEN = 'operator-token';
export const NOT_AN_OPERATOR_TOKEN = 'not-an-operator-token';

// Stands in for Auth0 at the operator API's edge: the operator's token verifies, a
// signed-in non-operator's is refused as such, and anything else — a vendor's token
// included, whose audience is wrong — does not verify at all.
export class FakeOperatorTokenVerifier extends OperatorTokenVerifier {
  verify(bearerToken: string): Promise<VerifiedOperator> {
    if (bearerToken === OPERATOR_TOKEN) {
      return Promise.resolve(testOperator);
    }
    if (bearerToken === NOT_AN_OPERATOR_TOKEN) {
      return Promise.reject(new NotAnOperatorError());
    }
    return Promise.reject(new InvalidTokenError());
  }
}
