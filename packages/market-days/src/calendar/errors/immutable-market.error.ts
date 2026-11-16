import { DomainError } from '@market-miam/common';

export class ImmutableMarketError extends DomainError {
  override readonly name = 'ImmutableMarketError';

  constructor(message: string) {
    super(message);
  }
}
