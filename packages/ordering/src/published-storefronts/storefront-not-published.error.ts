import { DomainError } from '@market-miam/common';

export class StorefrontNotPublishedError extends DomainError {
  override readonly name = 'StorefrontNotPublishedError';

  constructor() {
    super('Storefront is not published');
  }
}
