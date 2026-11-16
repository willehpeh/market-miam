import { DomainError } from '@market-miam/common';

export class UnscheduledMarketError extends DomainError {
  override readonly name = 'UnscheduledMarketError';

  constructor(message: string) {
    super(message);
  }
}
