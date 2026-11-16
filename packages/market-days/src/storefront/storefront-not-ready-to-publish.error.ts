import { DomainError } from '@market-miam/common';

export class StorefrontNotReadyToPublish extends DomainError {
  override readonly name = 'StorefrontNotReadyToPublish';

  constructor(public readonly missing: string[]) {
    super(`Storefront is not ready to publish: missing ${missing.join(', ')}`);
  }
}
