import { DomainError } from '@market-miam/common';

export class MarketDayInThePastError extends DomainError {
  override readonly name = 'MarketDayInThePastError';

  constructor() {
    super('Market day is in the past');
  }
}
