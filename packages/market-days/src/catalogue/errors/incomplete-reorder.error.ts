import { DomainError } from '@market-miam/common';

export class IncompleteReorderError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = 'IncompleteReorderError';
  }
}
