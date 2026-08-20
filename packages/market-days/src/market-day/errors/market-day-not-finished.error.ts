import { DomainError } from '@market-miam/common';

// Finished covers both doors: the vendor shut the stand, or the clock ran out (decision 54).
export class MarketDayNotFinishedError extends DomainError {
  constructor() {
    super('The market day is not finished');
    this.name = 'MarketDayNotFinishedError';
  }
}
