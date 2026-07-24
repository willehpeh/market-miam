import { DomainError } from '@market-miam/common';

export class DuplicateVariantNameError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = 'DuplicateVariantNameError';
  }
}
