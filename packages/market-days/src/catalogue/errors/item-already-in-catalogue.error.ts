import { DomainError } from '@market-miam/common';

export class ItemAlreadyInCatalogueError extends DomainError {
  override readonly name = 'ItemAlreadyInCatalogueError';

  constructor(message: string) {
    super(message);
  }
}
