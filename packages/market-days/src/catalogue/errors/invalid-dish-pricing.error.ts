import { DomainError } from '@market-miam/common';

export class InvalidDishPricingError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidDishPricingError';
  }
}
