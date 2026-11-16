import { DomainError } from './domain.error';

export class EmptyValueError extends DomainError {
  override readonly name = 'EmptyValueError';

  constructor(message = 'Value cannot be empty') {
    super(message);
  }
}
