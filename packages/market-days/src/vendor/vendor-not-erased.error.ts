import { DomainError } from '@market-miam/common';

export class VendorNotErasedError extends DomainError {
  override readonly name = 'VendorNotErasedError';

  constructor() {
    super('Vendor has not been erased');
  }
}
