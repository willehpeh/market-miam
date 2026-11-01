import { Account, Accounts } from './accounts';

const PAGE_SIZE = 100;
// ponytail: Auth0's GET /users stops at the first 1,000 users; its bulk export job is the way past.
const MAX_PAGES = 10;
const RENEW_BEFORE_EXPIRY_MS = 60_000;

interface Token {
  readonly value: string;
  readonly expiresAt: number;
}

interface Auth0UserRecord {
  email?: string;
  app_metadata?: { vendorId?: string };
}

// The accounts in the Auth0 tenant, through its Management API, as a machine-to-machine
// client that needs only `read:users`. Auth0 meters those clients' tokens, so one is
// kept until a minute before it expires, and lists started together share it.
export class Auth0Accounts extends Accounts {
  private token?: Promise<Token>;

  constructor(
    private readonly issuer: string,
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly now: () => number = Date.now,
  ) {
    super();
  }

  async all(): Promise<Account[]> {
    const token = await this.currentToken();
    const accounts: Account[] = [];
    for (let page = 0; page < MAX_PAGES; page++) {
      const batch = await this.page(token, page);
      accounts.push(...batch);
      if (batch.length < PAGE_SIZE) {
        break;
      }
    }
    return accounts;
  }

  private async currentToken(): Promise<string> {
    if (!this.token) {
      this.token = this.requestToken().catch((error: unknown) => {
        this.token = undefined;
        throw error;
      });
    }
    const token = await this.token;
    if (this.now() < token.expiresAt - RENEW_BEFORE_EXPIRY_MS) {
      return token.value;
    }
    this.token = undefined;
    return this.currentToken();
  }

  private async requestToken(): Promise<Token> {
    const requestedAt = this.now();
    const response = await fetch(new URL('oauth/token', this.issuer), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        audience: new URL('api/v2/', this.issuer).href,
      }),
    });
    if (!response.ok) {
      throw new Error(`Auth0 refused the Management API token: ${response.status}`);
    }
    const { access_token, expires_in } = (await response.json()) as { access_token: string; expires_in: number };
    return { value: access_token, expiresAt: requestedAt + expires_in * 1000 };
  }

  private async page(token: string, page: number): Promise<Account[]> {
    const url = new URL('api/v2/users', this.issuer);
    url.search = new URLSearchParams({
      per_page: String(PAGE_SIZE),
      page: String(page),
      fields: 'email,app_metadata',
      include_fields: 'true',
    }).toString();
    const response = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
    if (!response.ok) {
      throw new Error(`Auth0 refused the user list: ${response.status}`);
    }
    const users = (await response.json()) as Auth0UserRecord[];
    return users.map((user) => ({ email: user.email ?? null, vendorId: user.app_metadata?.vendorId ?? null }));
  }
}
