import { DomainError } from '@market-miam/common';

export class SubdomainTakenError extends DomainError {
  constructor() {
    super('Another vendor holds this subdomain');
    this.name = 'SubdomainTakenError';
  }
}
