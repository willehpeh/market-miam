export class ItemNotPlannedError extends Error {
  constructor() {
    super('Item not planned for market day');
    this.name = 'ItemNotPlannedError';
  }
}
