import { OperatorTokenVerifier, VerifiedOperator } from '@market-miam/auth';

export class FakeOperatorTokenVerifier extends OperatorTokenVerifier {
  readonly verified: string[] = [];

  constructor(private readonly outcome: VerifiedOperator | Error) {
    super();
  }

  verify(bearerToken: string): Promise<VerifiedOperator> {
    this.verified.push(bearerToken);
    return this.outcome instanceof Error
      ? Promise.reject(this.outcome)
      : Promise.resolve(this.outcome);
  }
}
