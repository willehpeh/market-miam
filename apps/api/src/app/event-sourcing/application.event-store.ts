import {
  DataKeys,
  Events,
  EventStore,
  MessageContext,
  MessageContextEventStore,
  PiiFields,
  ShreddingEventStore,
} from '@market-miam/event-sourcing';
import { TracingEventStore } from './tracing.event-store';

// The event store the application is wired to: a leaf adapter (in-memory or
// postgres) wrapped in the cross-cutting layers — shredding (PII encryption),
// message context (correlation/causation), and tracing. Composes the chain in
// its constructor so the composition root stays a single `new`.
export class ApplicationEventStore extends TracingEventStore {
  constructor(inner: EventStore & Events, keys: DataKeys, pii: PiiFields, context: MessageContext) {
    super(new MessageContextEventStore(new ShreddingEventStore(inner, keys, pii, 'vendorId'), context));
  }
}
