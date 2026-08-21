import { DomainError } from '@market-miam/common';

export class UnscheduledMarketError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = 'UnscheduledMarketError';
  }
}
