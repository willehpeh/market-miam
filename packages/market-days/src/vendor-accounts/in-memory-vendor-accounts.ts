import { AccountOpening, Invitation, VendorAccounts } from './vendor-accounts';

export type VendorAccount = { email: string; vendorId: string | null };

export class InMemoryVendorAccounts extends VendorAccounts {
  private readonly vendorIdByEmail: Map<string, string | null>;

  constructor(existing: VendorAccount[] = []) {
    super();
    this.vendorIdByEmail = new Map(existing.map(({ email, vendorId }) => [email, vendorId]));
  }

  openFor({ vendorId, email }: Invitation): Promise<AccountOpening> {
    if (this.vendorIdByEmail.has(email) && this.vendorIdByEmail.get(email) !== vendorId) {
      return Promise.resolve('email-in-use');
    }
    this.vendorIdByEmail.set(email, vendorId);
    return Promise.resolve('open');
  }

  closeFor(vendorId: string): Promise<void> {
    for (const [email, holder] of this.vendorIdByEmail) {
      if (holder === vendorId) {
        this.vendorIdByEmail.delete(email);
      }
    }
    return Promise.resolve();
  }

  all(): VendorAccount[] {
    return [...this.vendorIdByEmail].map(([email, vendorId]) => ({ email, vendorId }));
  }
}
