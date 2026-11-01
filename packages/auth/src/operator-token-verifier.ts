import type { VerifiedOperator } from './verified-operator';

export abstract class OperatorTokenVerifier {
  abstract verify(bearerToken: string): Promise<VerifiedOperator>;
}
