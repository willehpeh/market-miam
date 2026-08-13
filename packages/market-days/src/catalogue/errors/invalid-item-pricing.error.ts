import { DomainError } from '@market-miam/common';

export class InvalidItemPricingError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidItemPricingError';
  }
}
