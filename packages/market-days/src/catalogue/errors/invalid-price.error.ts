export class InvalidPriceError extends Error {
  constructor() {
    super('Price must be positive');
    this.name = 'InvalidPriceError';
  }
}
