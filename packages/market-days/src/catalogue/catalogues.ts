import { EventStore } from '@market-monster/event-sourcing';
import { Catalogue } from './catalogue';
import { VendorId } from '@market-monster/shared-kernel';

export class Catalogues {
  constructor(private readonly store: EventStore) {
  }

  async forVendor(vendorId: VendorId): Promise<Catalogue> {
    const events = await this.store.load(this.streamIdFor(vendorId));
    return new Catalogue().rehydrate(events);
  }

  async save(catalogue: Catalogue, vendorId: VendorId): Promise<void> {
    await this.store.append(
      this.streamIdFor(vendorId),
      catalogue.raisedEvents(),
      catalogue.currentStreamPosition(),
      { vendorId: vendorId.value() },
    );
  }

  private streamIdFor(vendorId: VendorId) {
    return `catalogue-${ vendorId.value() }`;
  }
}
