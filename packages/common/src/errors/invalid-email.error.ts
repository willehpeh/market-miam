import { DomainError } from './domain.error';

export class InvalidEmailError extends DomainError {
  constructor(message = 'Invalid email error') {
    super(message);
    this.name = 'InvalidEmailError';
  }
}