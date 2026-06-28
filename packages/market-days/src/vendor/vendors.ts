import { Vendor } from './vendor';
import { VendorId } from '@market-monster/shared-kernel';
import { VendorScopedEvents } from '../vendor-scoped-events';

export class Vendors {
  constructor(private readonly vendorEvents: VendorScopedEvents) {
  }

  async forVendor(vendorId: VendorId): Promise<Vendor> {
    const events = await this.vendorEvents.load(this.streamIdFor(vendorId));
    return new Vendor(vendorId).rehydrate(events);
  }

  async save(vendor: Vendor, vendorId: VendorId): Promise<void> {
    await this.vendorEvents.save(this.streamIdFor(vendorId), vendor, vendorId);
  }

  private streamIdFor(vendorId: VendorId) {
    return `vendor-${ vendorId.value() }`;
  }
}
