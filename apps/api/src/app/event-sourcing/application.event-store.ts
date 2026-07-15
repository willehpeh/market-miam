import {
  DataKeys,
  Events,
  EventStore,
  Lineage,
  LineageEventStore,
  PiiFields,
  ShreddingEventStore,
} from '@market-miam/event-sourcing';
import { TracingEventStore } from './tracing/event-store';

// The event store the application is wired to: a leaf adapter (in-memory or
// postgres) wrapped in the cross-cutting layers — shredding (PII encryption),
// lineage (correlation/causation), and tracing. Composes the chain in
// its constructor so the composition root stays a single `new`.
export class ApplicationEventStore extends TracingEventStore {
  constructor(inner: EventStore & Events, keys: DataKeys, pii: PiiFields, lineage: Lineage) {
    super(new LineageEventStore(new ShreddingEventStore(inner, keys, pii, 'vendorId'), lineage));
  }
}
