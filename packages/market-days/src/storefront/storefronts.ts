import { EventStore } from '@market-monster/event-sourcing';
import { VendorId } from '@market-monster/shared-kernel';
import { Storefront } from './storefront';

export class Storefronts {
  constructor(private readonly store: EventStore) {
  }

  async forVendor(vendorId: VendorId) {
    const events = await this.store.load(this.streamIdFor(vendorId));
    return new Storefront().rehydrate(events);
  }

  async save(storefront: Storefront, vendorId: VendorId) {
    await this.store.append(
      this.streamIdFor(vendorId),
      storefront.raisedEvents(),
      storefront.currentStreamPosition(),
      { vendorId: vendorId.value() }
    );
  }

  private streamIdFor(vendorId: VendorId) {
    return `storefront-${ vendorId.value() }`;
  }
}
