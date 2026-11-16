import { DomainError } from './domain.error';

export class InvalidEmailError extends DomainError {
  override readonly name = 'InvalidEmailError';

  constructor(message = 'Invalid email error') {
    super(message);
  }
}