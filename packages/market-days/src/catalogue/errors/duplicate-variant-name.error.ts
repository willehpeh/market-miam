import { DomainError } from '@market-miam/common';

export class DuplicateVariantNameError extends DomainError {
  override readonly name = 'DuplicateVariantNameError';

  constructor(message: string) {
    super(message);
  }
}
