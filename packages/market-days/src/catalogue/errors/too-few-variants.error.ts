import { DomainError } from '@market-miam/common';

export class TooFewVariantsError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = 'TooFewVariantsError';
  }
}
