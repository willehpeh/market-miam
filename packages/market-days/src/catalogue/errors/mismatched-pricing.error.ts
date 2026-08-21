import { DomainError } from '@market-miam/common';

export class MismatchedPricingError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = 'MismatchedPricingError';
  }
}
