import { DomainError } from '@market-miam/common';

export class VendorNotInvitedError extends DomainError {
  override readonly name = 'VendorNotInvitedError';

  constructor() {
    super('Vendor has not been invited');
  }
}
