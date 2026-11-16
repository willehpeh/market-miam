import { DomainError } from '@market-miam/common';

export class InvalidPriceError extends DomainError {
  override readonly name = 'InvalidPriceError';

  constructor() {
    super('Price must be a whole number of cents, zero or more');
  }
}
