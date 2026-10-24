import { DomainError } from '@market-miam/common';

export class VendorErasedError extends DomainError {
  constructor() {
    super('Vendor has been erased');
  }
}
