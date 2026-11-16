import { DomainError } from '@market-miam/common';

export class MarketDayEndedError extends DomainError {
  override readonly name = 'MarketDayEndedError';

  constructor() {
    super('The market has ended for the day');
  }
}
