import { DomainError } from '@market-miam/common';

export class RegistrationAlreadyOpenError extends DomainError {
  constructor() {
    super('A payment account registration is already open');
  }
}
