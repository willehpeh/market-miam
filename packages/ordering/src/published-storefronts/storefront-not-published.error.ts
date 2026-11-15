import { DomainError } from '@market-miam/common';

export class StorefrontNotPublishedError extends DomainError {
  constructor() {
    super('Storefront is not published');
  }
}
