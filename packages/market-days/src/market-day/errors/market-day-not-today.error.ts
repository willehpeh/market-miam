import { DomainError } from '@market-miam/common';

export class MarketDayNotTodayError extends DomainError {
  constructor() {
    super('Availability can only change on the day of the market');
    this.name = 'MarketDayNotTodayError';
  }
}
