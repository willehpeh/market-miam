import { DomainError } from '@market-miam/common';

export class MarketDayInThePastError extends DomainError {
  constructor() {
    super('Market day is in the past');
    this.name = 'MarketDayInThePastError';
  }
}
