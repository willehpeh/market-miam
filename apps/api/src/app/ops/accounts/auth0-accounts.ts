import { Account, Accounts } from './accounts';
import { Auth0ManagementApi } from './auth0-management-api';

const PAGE_SIZE = 100;
// ponytail: Auth0's GET /users stops at the first 1,000 users; its bulk export job is the way past.
const MAX_PAGES = 10;

interface Auth0UserRecord {
  email?: string;
  app_metadata?: { vendorId?: string };
}

// The accounts in the Auth0 tenant, read through its Management API with `read:users` only.
export class Auth0Accounts extends Accounts {
  constructor(private readonly api: Auth0ManagementApi) {
    super();
  }

  async all(): Promise<Account[]> {
    const accounts: Account[] = [];
    for (let page = 0; page < MAX_PAGES; page++) {
      const batch = await this.page(page);
      accounts.push(...batch);
      if (batch.length < PAGE_SIZE) {
        break;
      }
    }
    return accounts;
  }

  private async page(page: number): Promise<Account[]> {
    const query = new URLSearchParams({
      per_page: String(PAGE_SIZE),
      page: String(page),
      fields: 'email,app_metadata',
      include_fields: 'true',
    });
    const response = await this.api.fetch(`api/v2/users?${query}`);
    if (!response.ok) {
      throw new Error(`Auth0 refused the user list: ${response.status}`);
    }
    const users = (await response.json()) as Auth0UserRecord[];
    return users.map((user) => ({ email: user.email ?? null, vendorId: user.app_metadata?.vendorId ?? null }));
  }
}
