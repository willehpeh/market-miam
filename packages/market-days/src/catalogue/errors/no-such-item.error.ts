import { DomainError } from '@market-miam/common';

export class NoSuchItemError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = 'NoSuchItemError';
  }
}
