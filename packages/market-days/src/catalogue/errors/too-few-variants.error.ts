import { DomainError } from '@market-miam/common';

export class TooFewVariantsError extends DomainError {
  override readonly name = 'TooFewVariantsError';

  constructor(message: string) {
    super(message);
  }
}
