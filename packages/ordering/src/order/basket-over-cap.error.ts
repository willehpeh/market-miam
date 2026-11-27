import { DomainError } from '@market-miam/common';

export class BasketOverCapError extends DomainError {
  override readonly name = 'BasketOverCapError';
  readonly reason = 'over-cap';

  constructor() {
    super('Basket over the order cap');
  }
}
