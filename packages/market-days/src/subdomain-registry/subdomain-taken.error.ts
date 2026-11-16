import { DomainError } from '@market-miam/common';

export class SubdomainTakenError extends DomainError {
  override readonly name = 'SubdomainTakenError';

  constructor() {
    super('This subdomain is assigned to another vendor');
  }
}
