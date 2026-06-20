import { Email } from '@market-monster/common';
import { VendorId } from '@market-monster/shared-kernel';

export interface VerifiedVendor {
  readonly vendorId: VendorId;
  readonly email: Email;
}
