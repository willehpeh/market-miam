import { DomainError } from '@market-miam/common';

export class ItemNotPlannedError extends DomainError {
  constructor() {
    super('Item not planned for market day');
    this.name = 'ItemNotPlannedError';
  }
}
