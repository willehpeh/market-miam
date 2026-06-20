import { VendorStorefrontView, VendorStorefrontViews, VendorStorefrontViewStore } from '@market-monster/market-days';

export class InMemoryVendorStorefrontViews implements VendorStorefrontViews, VendorStorefrontViewStore {

  private readonly _storefronts: Map<string, VendorStorefrontView> = new Map<string, VendorStorefrontView>();

  async setCoverPhoto(vendorId: string, imageReference: string): Promise<void> {
    const storefront = await this.findOrCreateForVendor(vendorId);
    this._storefronts.set(vendorId, { ...storefront, imageReference });
  }

  async editInformation(vendorId: string, information: { name: string; description: string }): Promise<void> {
    const storefront = await this.findOrCreateForVendor(vendorId);
    this._storefronts.set(vendorId, { ...storefront, ...information });
  }

  findOrCreateForVendor(vendorId: string): Promise<VendorStorefrontView> {
    const storefront = this._storefronts.get(vendorId);
    if (!storefront) {
      const newStorefront = {
        name: '',
        description: '',
        imageReference: ''
      };
      this._storefronts.set(vendorId, newStorefront);
      return Promise.resolve(newStorefront);
    }
    return Promise.resolve(storefront);
  }

}
