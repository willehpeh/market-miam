import { DomainError } from '@market-miam/common';

export class BasketOverCapError extends DomainError {
  override readonly name = 'BasketOverCapError';

  constructor() {
    super('Basket over the order cap');
  }
}
