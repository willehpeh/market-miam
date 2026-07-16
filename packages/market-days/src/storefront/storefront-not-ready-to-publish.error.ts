import { DomainError } from '@market-miam/common';

export class StorefrontNotReadyToPublish extends DomainError {
  constructor(public readonly missing: string[]) {
    super(`Storefront is not ready to publish: missing ${missing.join(', ')}`);
    this.name = 'StorefrontNotReadyToPublish';
  }
}
