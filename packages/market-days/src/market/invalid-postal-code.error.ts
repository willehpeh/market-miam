import { DomainError } from '@market-miam/common';

export class InvalidPostalCodeError extends DomainError {
  constructor() {
    super('Code postal must be five digits');
    this.name = 'InvalidPostalCodeError';
  }
}
