import { DomainError } from '@market-miam/common';

export class NoSuchItemError extends DomainError {
  override readonly name = 'NoSuchItemError';

  constructor(message: string) {
    super(message);
  }
}
