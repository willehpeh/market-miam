import { DomainError } from './domain.error';

export class InvalidInstantError extends DomainError {
  override readonly name = 'InvalidInstantError';

  constructor(message = 'Invalid instant error') {
    super(message);
  }
}
