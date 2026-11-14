import { DomainError } from '@market-miam/common';

export class SubdomainAlreadyAssignedError extends DomainError {
  constructor() {
    super('This vendor holds another subdomain already');
    this.name = 'SubdomainAlreadyAssignedError';
  }
}
