import { DEV_FALLBACK_VENDOR_ID } from '@market-miam/auth';
import { SignInAddress } from '@market-miam/common';
import { Account, Accounts } from './accounts';

// Dev-only stand-in for Auth0: the one account local development signs vendors in as
// (DevelopmentTokenVerifier), whose subdomain the dev seed registers.
export class DevelopmentAccounts extends Accounts {
  private readonly address = new SignInAddress('dev@local.test');

  all(): Promise<Account[]> {
    return Promise.resolve([{ email: this.address.value(), vendorId: DEV_FALLBACK_VENDOR_ID }]);
  }

  contains(address: SignInAddress): Promise<boolean> {
    return Promise.resolve(address.equals(this.address));
  }
}
