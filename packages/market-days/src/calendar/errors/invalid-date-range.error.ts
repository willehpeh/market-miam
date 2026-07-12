import { DomainError } from '@market-miam/common';

export class InvalidDateRangeError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidDateRangeError';
  }
}
