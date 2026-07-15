import { eventStoreContract } from './event-store.contract';
import {
  InMemoryEventStore,
  Lineage,
  LineageEventStore,
} from '@market-miam/event-sourcing';

// The context-stamping decorator must remain a faithful EventStore: outside a
// dispatch it has no context to add, so it upholds the full contract — including
// load, and adding no metadata when none is supplied. Its context-merge
// behaviour during a dispatch is covered in lineage.spec.ts.
eventStoreContract(
  'LineageEventStore',
  () => new LineageEventStore(new InMemoryEventStore(), new Lineage()),
);
