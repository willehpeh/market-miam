import { AccountOpening, Invitation, VendorAccounts } from './vendor-accounts';

export class InMemoryVendorAccounts extends VendorAccounts {
  private readonly accounts: Invitation[] = [];

  ensureOpenFor({ vendorId, email }: Invitation): Promise<AccountOpening> {
    this.accounts.push({ vendorId, email });
    return Promise.resolve('open');
  }

  all(): Invitation[] {
    return [...this.accounts];
  }
}
