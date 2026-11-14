import { DomainError } from '@market-miam/common';

export class VendorNotErasedError extends DomainError {
  constructor() {
    super('Vendor has not been erased');
  }
}
