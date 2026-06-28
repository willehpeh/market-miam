import { Catalogue } from './catalogue';
import { VendorId } from '@market-monster/shared-kernel';
import { VendorScopedEvents } from '../vendor-scoped-events';

export class Catalogues {
  constructor(private readonly vendorEvents: VendorScopedEvents) {
  }

  async forVendor(vendorId: VendorId): Promise<Catalogue> {
    const events = await this.vendorEvents.load(this.streamIdFor(vendorId));
    return new Catalogue().rehydrate(events);
  }

  async save(catalogue: Catalogue, vendorId: VendorId): Promise<void> {
    await this.vendorEvents.save(this.streamIdFor(vendorId), catalogue, vendorId);
  }

  private streamIdFor(vendorId: VendorId) {
    return `catalogue-${ vendorId.value() }`;
  }
}
