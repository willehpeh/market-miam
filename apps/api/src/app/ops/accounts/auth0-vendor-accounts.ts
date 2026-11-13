import { AccountOpening, Invitation, VendorAccounts } from '@market-miam/market-days';
import { Auth0ManagementApi } from './auth0-management-api';

// Vendors sign in on the passwordless email connection; operators' GitHub accounts are elsewhere.
const VENDOR_CONNECTION = 'email';

// What Auth0 answers when the email already has a user on the connection.
const CONFLICT = 409;

interface HeldAccount {
  app_metadata?: { vendorId?: string };
}

// Vendors' sign-in accounts in the Auth0 tenant, opened through its Management API
// (`create:users`), each carrying its vendorId in app_metadata (ADR 0060).
export class Auth0VendorAccounts extends VendorAccounts {
  constructor(private readonly api: Auth0ManagementApi) {
    super();
  }

  async openFor({ vendorId, email }: Invitation): Promise<AccountOpening> {
    const created = await this.api.fetch('api/v2/users', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ connection: VENDOR_CONNECTION, email, app_metadata: { vendorId } }),
    });
    if (created.status === CONFLICT) {
      const held = await this.accountsHolding(email);
      return held.some((account) => account.app_metadata?.vendorId === vendorId) ? 'open' : 'email-in-use';
    }
    if (!created.ok) {
      throw new Error(`Auth0 refused to open a vendor's account: ${created.status}`);
    }
    return 'open';
  }

  private async accountsHolding(email: string): Promise<HeldAccount[]> {
    const response = await this.api.fetch(`api/v2/users-by-email?${new URLSearchParams({ email })}`);
    return (await response.json()) as HeldAccount[];
  }
}
