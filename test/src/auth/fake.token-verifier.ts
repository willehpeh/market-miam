import { InvalidTokenError, TokenVerifier, VerifiedVendor } from '@market-miam/auth';

export class FakeTokenVerifier extends TokenVerifier {
  readonly verified: string[] = [];

  constructor(private readonly outcome: VerifiedVendor | InvalidTokenError) {
    super();
  }

  verify(bearerToken: string): Promise<VerifiedVendor> {
    this.verified.push(bearerToken);
    return this.outcome instanceof Error
      ? Promise.reject(this.outcome)
      : Promise.resolve(this.outcome);
  }
}
