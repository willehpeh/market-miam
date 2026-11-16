import { DomainError } from '@market-miam/common';

export class VendorNotRegisteredError extends DomainError {
  override readonly name = 'VendorNotRegisteredError';

  constructor() {
    super('Vendor has not registered');
  }
}
