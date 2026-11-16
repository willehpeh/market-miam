import { DomainError } from '@market-miam/common';

export class VendorErasedError extends DomainError {
  override readonly name = 'VendorErasedError';

  constructor() {
    super('Vendor has been erased');
  }
}
