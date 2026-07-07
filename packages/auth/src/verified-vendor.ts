import { Email } from '@market-miam/common';
import { VendorId } from '@market-miam/shared-kernel';

export interface VerifiedVendor {
  readonly vendorId: VendorId;
  readonly email: Email;
}
