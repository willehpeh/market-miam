import { VendorLegalIdentityView } from './vendor-legal-identity-view';
import { VendorLegalIdentityViews } from './vendor-legal-identity-views';
import { VendorLegalIdentityViewStore } from './vendor-legal-identity-view.store';

export class InMemoryVendorLegalIdentityViews implements VendorLegalIdentityViews, VendorLegalIdentityViewStore {
  private readonly identities = new Map<string, VendorLegalIdentityView>();

  findByVendor(vendorId: string): Promise<VendorLegalIdentityView | undefined> {
    return Promise.resolve(this.identities.get(vendorId));
  }

  async provide(vendorId: string, identity: VendorLegalIdentityView): Promise<void> {
    this.identities.set(vendorId, identity);
  }

  async remove(vendorId: string): Promise<void> {
    this.identities.delete(vendorId);
  }

  async clear(): Promise<void> {
    this.identities.clear();
  }
}
