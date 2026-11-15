import { Aggregate, EventStore, StoredEvent } from '@market-miam/event-sourcing';
import { VendorId } from './vendor-id';
import { VENDOR_ID_METADATA_KEY } from './vendor-metadata';

export class VendorScopedEvents {
  constructor(private readonly store: EventStore) {
  }

  load(streamId: string): Promise<StoredEvent[]> {
    return this.store.load(streamId);
  }

  save(streamId: string, aggregate: Aggregate, vendorId: VendorId): Promise<void> {
    if (aggregate.raisedEvents().length === 0) {
      return Promise.resolve();
    }
    return this.store.append(
      streamId,
      aggregate.raisedEvents(),
      aggregate.currentStreamPosition(),
      { [VENDOR_ID_METADATA_KEY]: vendorId.value() },
    );
  }
}
