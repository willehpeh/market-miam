import { Aggregate, EventStore, StoredEvent } from '@market-monster/event-sourcing';
import { VendorId } from '@market-monster/shared-kernel';

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
      { vendorId: vendorId.value() },
    );
  }
}
