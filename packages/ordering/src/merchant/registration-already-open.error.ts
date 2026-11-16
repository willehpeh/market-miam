import { DomainError } from '@market-miam/common';

export class RegistrationAlreadyOpenError extends DomainError {
  override readonly name = 'RegistrationAlreadyOpenError';

  constructor() {
    super('A payment account registration is already open');
  }
}
