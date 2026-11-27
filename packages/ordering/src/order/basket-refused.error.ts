import { DomainError } from '@market-miam/common';
import { RefusalReason } from './refusal-reason';

export class BasketRefusedError extends DomainError {
  override readonly name = 'BasketRefusedError';

  constructor(readonly reason: RefusalReason) {
    super(`Basket refused: ${reason}`);
  }
}
