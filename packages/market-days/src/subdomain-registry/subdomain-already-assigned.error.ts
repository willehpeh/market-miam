import { DomainError } from '@market-miam/common';

export class SubdomainAlreadyAssignedError extends DomainError {
  constructor() {
    super('This vendor has a subdomain already');
    this.name = 'SubdomainAlreadyAssignedError';
  }
}
