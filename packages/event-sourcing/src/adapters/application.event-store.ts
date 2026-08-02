import { DataKeys } from '../ports/data-keys';
import { Events } from '../ports/events';
import { EventStore } from '../ports/event-store';
import { Lineage } from '../ports/lineage';
import { LineageEventStore } from './lineage.event-store';
import { PiiFields, ShreddingEventStore } from './shredding.event-store';
import { TracingEventStore } from './tracing.event-store';

// The event store an application should be wired to: a leaf adapter (in-memory or
// postgres) wrapped in the cross-cutting layers — shredding (PII encryption),
// lineage (correlation/causation), and tracing. Composes the chain in
// its constructor so the composition root stays a single `new`.
export class ApplicationEventStore extends TracingEventStore {
  constructor(inner: EventStore & Events, keys: DataKeys, pii: PiiFields, lineage: Lineage) {
    super(new LineageEventStore(new ShreddingEventStore(inner, keys, pii, 'vendorId'), lineage));
  }
}
