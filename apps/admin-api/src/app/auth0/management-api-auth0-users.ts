import { requireEnv } from '../require-env';
import { Auth0Account, Auth0Users } from './auth0-users';

interface Auth0UserRecord {
  email?: string;
  app_metadata?: { vendorId?: string };
}

export class ManagementApiAuth0Users extends Auth0Users {
  private readonly domain = requireEnv('AUTH0_DOMAIN');
  private readonly clientId = requireEnv('AUTH0_MGMT_CLIENT_ID');
  private readonly clientSecret = requireEnv('AUTH0_MGMT_CLIENT_SECRET');

  async all(): Promise<Auth0Account[]> {
    const token = await this.token();
    const accounts: Auth0Account[] = [];
    // ponytail: Auth0 GET /users caps at the first 1000 users; swap to the bulk export job if we outgrow it.
    for (let page = 0; page < 10; page++) {
      const batch = await this.page(token, page);
      accounts.push(...batch);
      if (batch.length < 100) break;
    }
    return accounts;
  }

  private async token(): Promise<string> {
    const response = await fetch(`https://${this.domain}/oauth/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        audience: `https://${this.domain}/api/v2/`,
      }),
    });
    if (!response.ok) throw new Error(`Auth0 token request failed: ${response.status}`);
    return ((await response.json()) as { access_token: string }).access_token;
  }

  private async page(token: string, page: number): Promise<Auth0Account[]> {
    const url = `https://${this.domain}/api/v2/users?per_page=100&page=${page}&fields=email,app_metadata&include_fields=true`;
    const response = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error(`Auth0 users request failed: ${response.status}`);
    const users = (await response.json()) as Auth0UserRecord[];
    return users.map((user) => ({ email: user.email ?? '', vendorId: user.app_metadata?.vendorId }));
  }
}
