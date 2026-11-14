import { DomainError } from '@market-miam/common';

export class VendorNotInvitedError extends DomainError {
  constructor() {
    super('Vendor has not been invited');
  }
}
