import { VendorStorefrontView } from './vendor-storefront-view';
import { VendorStorefrontViews } from './vendor-storefront-views';
import { VendorStorefrontViewStore } from './vendor-storefront-view.store';

export class InMemoryVendorStorefrontViews implements VendorStorefrontViews, VendorStorefrontViewStore {

  private readonly _storefronts: Map<string, VendorStorefrontView> = new Map<string, VendorStorefrontView>();

  findByVendor(vendorId: string): Promise<VendorStorefrontView | undefined> {
    return Promise.resolve(this._storefronts.get(vendorId));
  }

  async open(vendorId: string): Promise<void> {
    this.viewFor(vendorId);
  }

  async setCoverPhoto(vendorId: string, imageReference: string): Promise<void> {
    this._storefronts.set(vendorId, { ...this.viewFor(vendorId), imageReference });
  }

  async editInformation(vendorId: string, information: { name: string; description: string }): Promise<void> {
    this._storefronts.set(vendorId, { ...this.viewFor(vendorId), ...information });
  }

  private viewFor(vendorId: string): VendorStorefrontView {
    const existing = this._storefronts.get(vendorId);
    if (existing) {
      return existing;
    }
    const created = { name: '', description: '', imageReference: '' };
    this._storefronts.set(vendorId, created);
    return created;
  }

}
