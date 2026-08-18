import { DomainError } from '@market-miam/common';

export class MarketDayClosedError extends DomainError {
  constructor() {
    super('The market day is closed');
    this.name = 'MarketDayClosedError';
  }
}
