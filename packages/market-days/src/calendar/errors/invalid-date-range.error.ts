import { DomainError } from '@market-miam/common';

export class InvalidDateRangeError extends DomainError {
  override readonly name = 'InvalidDateRangeError';

  constructor(message: string) {
    super(message);
  }
}
