import { VendorErased, VendorInvited } from '../vendor/events';

export type Invitation = Pick<VendorInvited['payload'], 'vendorId' | 'email'>;
export type Erasure = Pick<VendorErased['payload'], 'vendorId'>;

export type AccountOpening = 'open' | 'email-in-use' | 'email-refused';

export abstract class VendorAccounts {
  abstract openFor(invitation: Invitation): Promise<AccountOpening>;
  abstract closeFor(erasure: Erasure): Promise<void>;
}
