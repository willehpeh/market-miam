import { DomainError } from './domain.error';

export class InvalidInstantError extends DomainError {
  constructor(message = 'Invalid instant error') {
    super(message);
    this.name = 'InvalidInstantError';
  }
}
