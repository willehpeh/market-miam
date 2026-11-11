import { AccountOpening, Invitation, VendorAccounts } from './vendor-accounts';

export type VendorAccount = { vendorId: string; email: string };

export class InMemoryVendorAccounts extends VendorAccounts {
  private readonly vendorIdByEmail = new Map<string, string>();

  openFor({ vendorId, email }: Invitation): Promise<AccountOpening> {
    const holder = this.vendorIdByEmail.get(email);
    if (holder !== undefined && holder !== vendorId) {
      return Promise.resolve('email-in-use');
    }
    this.vendorIdByEmail.set(email, vendorId);
    return Promise.resolve('open');
  }

  all(): VendorAccount[] {
    return [...this.vendorIdByEmail].map(([email, vendorId]) => ({ vendorId, email }));
  }
}
