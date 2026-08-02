import { eventStoreContract } from './event-store.contract';
import { ApplicationEventStore, InMemoryEventStore, Lineage } from '@market-miam/event-sourcing';

// The composed store must remain a faithful EventStore: with no tracing SDK
// registered and no dispatch active, both inline stamps are pass-through — so
// the composition upholds the whole contract, including load, and adds no
// metadata when none is supplied. The lineage-merge behaviour during a dispatch
// is covered in lineage.spec.ts; the shredder it wraps in production holds the
// same contract via shredding-event-store.contract.spec.ts.
eventStoreContract(
  'ApplicationEventStore',
  () => new ApplicationEventStore(new InMemoryEventStore(), new Lineage()),
);
