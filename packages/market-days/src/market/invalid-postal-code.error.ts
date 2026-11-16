import { DomainError } from '@market-miam/common';

export class InvalidPostalCodeError extends DomainError {
  override readonly name = 'InvalidPostalCodeError';

  constructor() {
    super('Code postal must be five digits');
  }
}
