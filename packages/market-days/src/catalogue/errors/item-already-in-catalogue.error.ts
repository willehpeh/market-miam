import { DomainError } from '@market-miam/common';

export class ItemAlreadyInCatalogueError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = 'ItemAlreadyInCatalogueError';
  }
}
