export class ItemAlreadyInCatalogueError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ItemAlreadyInCatalogueError';
  }
}
