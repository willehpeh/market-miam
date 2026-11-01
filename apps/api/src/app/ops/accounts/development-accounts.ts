import { DEV_FALLBACK_VENDOR_ID } from '@market-miam/auth';
import { Account, Accounts } from './accounts';

// Dev-only stand-in for Auth0: the one account local development signs vendors in as
// (DevelopmentTokenVerifier), whose subdomain the dev seed registers.
export class DevelopmentAccounts extends Accounts {
  all(): Promise<Account[]> {
    return Promise.resolve([{ email: 'dev@local.test', vendorId: DEV_FALLBACK_VENDOR_ID }]);
  }
}
