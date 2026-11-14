import { AccountOpening, Invitation, VendorAccounts } from '@market-miam/market-days';
import { Auth0Users } from './auth0-users';

// Vendors sign in on the passwordless email connection, and only there.
const VENDOR_CONNECTION = 'email';

// Vendors' sign-in accounts in the Auth0 tenant, opened through its Management API
// (`create:users`), each carrying its vendorId in app_metadata (ADR 0060). Auth0 emails the vendor
// as it opens the account, and nothing here can stop it: the tenant's passwordless email template
// makes that email the invitation.
export class Auth0VendorAccounts extends VendorAccounts {
  constructor(private readonly users: Auth0Users) {
    super();
  }

  async openFor({ vendorId, email }: Invitation): Promise<AccountOpening> {
    switch (await this.users.create({ connection: VENDOR_CONNECTION, email, app_metadata: { vendorId } })) {
      case 'created':
        return 'open';
      case 'address-refused':
        return 'email-refused';
      case 'already-exists':
        return (await this.isThisVendors(email, vendorId)) ? 'open' : 'email-in-use';
    }
  }

  // A retry after a half-finished run finds the account it opened.
  private async isThisVendors(email: string, vendorId: string): Promise<boolean> {
    return (await this.users.withEmail(email)).some((user) => user.app_metadata?.vendorId === vendorId);
  }
}
