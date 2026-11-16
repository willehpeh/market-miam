import { DomainError } from '@market-miam/common';

export class SubdomainAlreadyAssignedError extends DomainError {
  override readonly name = 'SubdomainAlreadyAssignedError';

  constructor() {
    super('This vendor has a subdomain already');
  }
}
