import { AccountOpening, Invitation, VendorAccounts } from './vendor-accounts';

export type VendorAccount = { vendorId: string; email: string };

export class InMemoryVendorAccounts extends VendorAccounts {
  private readonly accounts: VendorAccount[] = [];

  ensureOpenFor({ vendorId, email }: Invitation): Promise<AccountOpening> {
    this.accounts.push({ vendorId, email });
    return Promise.resolve('open');
  }

  all(): VendorAccount[] {
    return [...this.accounts];
  }
}
