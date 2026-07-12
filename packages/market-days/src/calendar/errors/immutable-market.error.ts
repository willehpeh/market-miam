import { DomainError } from '@market-miam/common';

export class ImmutableMarketError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = 'ImmutableMarketError';
  }
}
