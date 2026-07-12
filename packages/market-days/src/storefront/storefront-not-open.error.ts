import { DomainError } from '@market-miam/common';

export class StorefrontNotOpenError extends DomainError {
  constructor() {
    super('Storefront has not been opened');
  }
}
