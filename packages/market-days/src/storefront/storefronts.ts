import { VendorId } from '@market-monster/shared-kernel';
import { Storefront } from './storefront';
import { VendorScopedEvents } from '../vendor-scoped-events';

export class Storefronts {
  constructor(private readonly vendorEvents: VendorScopedEvents) {
  }

  async forVendor(vendorId: VendorId) {
    const events = await this.vendorEvents.load(this.streamIdFor(vendorId));
    return new Storefront().rehydrate(events);
  }

  async save(storefront: Storefront, vendorId: VendorId) {
    await this.vendorEvents.save(this.streamIdFor(vendorId), storefront, vendorId);
  }

  private streamIdFor(vendorId: VendorId) {
    return `storefront-${ vendorId.value() }`;
  }
}
