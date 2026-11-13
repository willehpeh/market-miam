import { AccountOpening, Invitation, VendorAccounts } from '@market-miam/market-days';
import { Auth0ManagementApi } from './auth0-management-api';

// Vendors sign in on the passwordless email connection; operators' GitHub accounts are elsewhere.
const VENDOR_CONNECTION = 'email';

// Vendors' sign-in accounts in the Auth0 tenant, opened through its Management API
// (`create:users`), each carrying its vendorId in app_metadata (ADR 0060).
export class Auth0VendorAccounts extends VendorAccounts {
  constructor(private readonly api: Auth0ManagementApi) {
    super();
  }

  async openFor({ vendorId, email }: Invitation): Promise<AccountOpening> {
    await this.api.fetch('api/v2/users', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ connection: VENDOR_CONNECTION, email, app_metadata: { vendorId } }),
    });
    return 'open';
  }
}
