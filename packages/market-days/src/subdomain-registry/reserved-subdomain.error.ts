import { DomainError } from '@market-miam/common';

export class ReservedSubdomainError extends DomainError {
  override readonly name = 'ReservedSubdomainError';

  constructor() {
    super('A subdomain Market Miam keeps for itself');
  }
}
