import { DomainError } from './domain.error';

export class EmptyValueError extends DomainError {
  constructor(message = 'Value cannot be empty') {
    super(message);
    this.name = 'EmptyValueError';
  }
}
