export class InvalidPriceError extends Error {
  constructor() {
    super('Price must be positive or zero');
    this.name = 'InvalidPriceError';
  }
}
