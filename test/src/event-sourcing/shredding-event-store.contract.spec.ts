import { eventStoreContract } from './event-store.contract';
import { InMemoryDataKeys, InMemoryEventStore, ShreddingEventStore } from '@market-miam/event-sourcing';

// Pins the decorator's transparency: the contract's events are outside the PII
// registry, so this asserts ShreddingEventStore preserves ordering, positions,
// ids, timestamps, and metadata for everything it doesn't encrypt. The crypto
// paths have their own spec (shredding.event-store.spec.ts).
eventStoreContract('ShreddingEventStore over InMemoryEventStore', () => {
  return new ShreddingEventStore(
    new InMemoryEventStore(),
    new InMemoryDataKeys(),
    { VendorRegistered: ['email'] },
    'vendorId',
  );
});
