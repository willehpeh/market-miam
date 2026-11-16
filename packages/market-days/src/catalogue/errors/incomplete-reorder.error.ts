import { DomainError } from '@market-miam/common';

export class IncompleteReorderError extends DomainError {
  override readonly name = 'IncompleteReorderError';

  constructor(message: string) {
    super(message);
  }
}
