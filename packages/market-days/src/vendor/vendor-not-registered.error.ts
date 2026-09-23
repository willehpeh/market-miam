import { DomainError } from '@market-miam/common';

export class VendorNotRegisteredError extends DomainError {
  constructor() {
    super('Vendor has not registered');
  }
}
