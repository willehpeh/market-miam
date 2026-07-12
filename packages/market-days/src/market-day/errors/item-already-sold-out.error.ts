import { DomainError } from '@market-miam/common';

export class ItemAlreadySoldOutError extends DomainError {
  constructor() {
    super('Item already sold out for market day');
    this.name = 'ItemAlreadySoldOutError';
  }
}
