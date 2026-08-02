import { eventStoreContract } from './event-store.contract';
import {
  ApplicationEventStore,
  InMemoryDataKeys,
  InMemoryEventStore,
  Lineage,
} from '@market-miam/event-sourcing';

// The full composed store must remain a faithful EventStore: with no PII fields
// configured, no tracing SDK registered, and no dispatch active, every layer is
// pass-through — so the composition upholds the whole contract, including load,
// and adds no metadata when none is supplied. The lineage-merge behaviour during
// a dispatch is covered in lineage.spec.ts.
eventStoreContract(
  'ApplicationEventStore',
  () => new ApplicationEventStore(new InMemoryEventStore(), new InMemoryDataKeys(), {}, new Lineage()),
);
