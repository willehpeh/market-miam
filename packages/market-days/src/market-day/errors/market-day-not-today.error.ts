import { DomainError } from '@market-miam/common';

export class MarketDayNotTodayError extends DomainError {
  override readonly name = 'MarketDayNotTodayError';

  constructor() {
    super('A market day can only be changed on the day of the market');
  }
}
