import { EventStore } from '@market-monster/event-sourcing';
import { Vendor } from './vendor';
import { VendorId } from '@market-monster/shared-kernel';

export class Vendors {
  constructor(private readonly store: EventStore) {
  }

  async forVendor(vendorId: VendorId): Promise<Vendor> {
    const events = await this.store.load(this.streamIdFor(vendorId));
    return new Vendor(vendorId).rehydrate(events);
  }

  async save(vendor: Vendor, vendorId: VendorId): Promise<void> {
    if (vendor.raisedEvents().length === 0) {
      return;
    }
    await this.store.append(
      this.streamIdFor(vendorId),
      vendor.raisedEvents(),
      vendor.currentStreamPosition,
      { vendorId: vendorId.value() },
    );
  }

  private streamIdFor(vendorId: VendorId) {
    return `vendor-${ vendorId.value() }`;
  }
}
