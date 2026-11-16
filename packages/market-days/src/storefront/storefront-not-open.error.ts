import { DomainError } from '@market-miam/common';

export class StorefrontNotOpenError extends DomainError {
  override readonly name = 'StorefrontNotOpenError';

  constructor() {
    super('Storefront has not been opened');
  }
}
