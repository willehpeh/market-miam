import { VendorInvited } from '../vendor/events';

export type Invitation = Pick<VendorInvited['payload'], 'vendorId' | 'email'>;

export type AccountOpening = 'open' | 'email-in-use';

export abstract class VendorAccounts {
  abstract openFor(invitation: Invitation): Promise<AccountOpening>;
}
