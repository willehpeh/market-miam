import { DomainError } from '@market-miam/common';

export class MarketDayInThePastError extends DomainError {
  constructor() {
    super();
    this.name = 'MarketDayInThePastError';
  }
}
