import { DomainError } from '@market-miam/common';

export class InvalidItemPricingError extends DomainError {
  override readonly name = 'InvalidItemPricingError';

  constructor(message: string) {
    super(message);
  }
}
