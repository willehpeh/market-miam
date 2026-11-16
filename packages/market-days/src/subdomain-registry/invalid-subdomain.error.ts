import { DomainError } from '@market-miam/common';

export class InvalidSubdomainError extends DomainError {
  override readonly name = 'InvalidSubdomainError';

  constructor() {
    super('Not a subdomain a storefront can live at');
  }
}
