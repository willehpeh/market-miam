import { DomainError } from '@market-miam/common';

export class InvalidSubdomainError extends DomainError {
  constructor() {
    super('Not a subdomain a storefront can live at');
    this.name = 'InvalidSubdomainError';
  }
}
