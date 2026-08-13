import { DomainError } from '@market-miam/common';

export class ItemAlreadyAvailableError extends DomainError {
  constructor() {
    super('Item is not sold out for market day');
    this.name = 'ItemAlreadyAvailableError';
  }
}
