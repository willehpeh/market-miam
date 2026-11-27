import { DomainError } from '@market-miam/common';

export class MalformedBasketError extends DomainError {
  override readonly name = 'MalformedBasketError';

  constructor() {
    super('Basket is malformed');
  }
}
