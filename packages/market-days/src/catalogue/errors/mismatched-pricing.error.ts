import { DomainError } from '@market-miam/common';

export class MismatchedPricingError extends DomainError {
  override readonly name = 'MismatchedPricingError';

  constructor(message: string) {
    super(message);
  }
}
