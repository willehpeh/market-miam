import { DomainError } from '@market-miam/common';

export class ItemNotPlannedError extends DomainError {
  override readonly name = 'ItemNotPlannedError';

  constructor() {
    super('Item not planned for market day');
  }
}
