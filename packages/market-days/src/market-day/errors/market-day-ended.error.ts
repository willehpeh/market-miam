import { DomainError } from '@market-miam/common';

export class MarketDayEndedError extends DomainError {
  constructor() {
    super('The market has ended for the day');
    this.name = 'MarketDayEndedError';
  }
}
