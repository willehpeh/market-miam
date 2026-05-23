import { EventStore } from '@market-monster/event-sourcing';
import { Repertoire } from './repertoire';
import { assignedToVendor, VendorId } from '@market-monster/shared-kernel';

export class Repertoires {
  constructor(private readonly store: EventStore) {
  }

  async forVendor(vendorId: VendorId): Promise<Repertoire> {
    const events = await this.store.load(this.streamIdFor(vendorId));
    return new Repertoire().rehydrate(events);
  }

  async save(repertoire: Repertoire, vendorId: VendorId): Promise<void> {
    const envelopes = assignedToVendor(repertoire.raisedEvents(), vendorId);
    await this.store.append(this.streamIdFor(vendorId), envelopes, repertoire.currentStreamPosition);
  }

  private streamIdFor(vendorId: VendorId) {
    return `repertoire-${ vendorId.value() }`;
  }
}
