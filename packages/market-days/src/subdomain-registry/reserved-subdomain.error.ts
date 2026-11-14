import { DomainError } from '@market-miam/common';

export class ReservedSubdomainError extends DomainError {
  constructor() {
    super('A subdomain Market Miam keeps for itself');
    this.name = 'ReservedSubdomainError';
  }
}
