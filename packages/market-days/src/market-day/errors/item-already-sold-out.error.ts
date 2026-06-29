export class ItemAlreadySoldOutError extends Error {
  constructor() {
    super('Item already sold out for market day');
    this.name = 'ItemAlreadySoldOutError';
  }
}
