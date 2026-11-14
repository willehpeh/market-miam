import { DomainError } from '@market-miam/common';

export class SubdomainTakenError extends DomainError {
  constructor() {
    super('This subdomain is assigned to another vendor');
    this.name = 'SubdomainTakenError';
  }
}
