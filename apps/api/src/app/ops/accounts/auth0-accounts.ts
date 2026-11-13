import { SignInAddress } from '@market-miam/common';
import { Account, Accounts } from './accounts';
import { Auth0Users } from './auth0-users';

const PAGE_SIZE = 100;
// ponytail: Auth0's GET /users stops at the first 1,000 users; its bulk export job is the way past.
const MAX_PAGES = 10;

// The accounts in the Auth0 tenant, read through its Management API with `read:users` only.
export class Auth0Accounts extends Accounts {
  constructor(private readonly users: Auth0Users) {
    super();
  }

  async all(): Promise<Account[]> {
    const accounts: Account[] = [];
    for (let page = 0; page < MAX_PAGES; page++) {
      const batch = await this.users.page(page, PAGE_SIZE);
      accounts.push(...batch.map((user) => ({ email: user.email ?? null, vendorId: user.app_metadata?.vendorId ?? null })));
      if (batch.length < PAGE_SIZE) {
        break;
      }
    }
    return accounts;
  }

  async contains(address: SignInAddress): Promise<boolean> {
    return (await this.users.withEmail(address.value())).length > 0;
  }
}
