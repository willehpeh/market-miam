import { AccountOpening, Invitation, VendorAccounts } from '@market-miam/market-days';
import { Auth0ManagementApi } from './auth0-management-api';

// Vendors sign in on the passwordless email connection, and only there.
const VENDOR_CONNECTION = 'email';

// What Auth0 answers when the email already has a user on the connection.
const CONFLICT = 409;
// What Auth0 answers when it refuses the request, the address among other reasons.
const BAD_REQUEST = 400;

interface Refusal {
  errorCode?: string;
  message?: string;
}

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
    if (created.status === BAD_REQUEST && refusesTheAddress((await created.json()) as Refusal)) {
      return 'email-refused';
    }
    if (!created.ok) {
      throw new Error(`Auth0 refused to open a vendor's account: ${created.status}`);
    }
    return 'open';
  }

  private async accountsHolding(email: string): Promise<HeldAccount[]> {
    const response = await this.api.fetch(`api/v2/users-by-email?${new URLSearchParams({ email })}`);
    if (!response.ok) {
      throw new Error(`Auth0 refused to say who holds an address: ${response.status}`);
    }
    return (await response.json()) as HeldAccount[];
  }
}

// Auth0's payload validation failing on the email property, and only that: any other 400 may
// be a fault of ours, better thrown and retried than taken for a refused address.
function refusesTheAddress({ errorCode, message }: Refusal): boolean {
  return errorCode === 'invalid_body' && / on property email\b/.test(message ?? '');
}
