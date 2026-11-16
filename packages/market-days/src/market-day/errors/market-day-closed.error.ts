import { DomainError } from '@market-miam/common';

export class MarketDayClosedError extends DomainError {
  override readonly name = 'MarketDayClosedError';

  constructor() {
    super('The market day is closed');
  }
}
