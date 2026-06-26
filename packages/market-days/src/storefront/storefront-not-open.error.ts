export class StorefrontNotOpenError extends Error {
  constructor() {
    super('Storefront has not been opened');
  }
}
