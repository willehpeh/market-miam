import { DataKeys } from '../ports/data-keys';
import { DomainEvent } from '../domain/domain-event';
import { Events } from '../ports/events';
import { EventStore } from '../ports/event-store';
import { Lineage } from '../ports/lineage';
import { PiiFields, ShreddingEventStore } from './shredding.event-store';
import { TracingEventStore } from './tracing.event-store';

// The event store an application should be wired to: a leaf adapter (in-memory or
// postgres) wrapped in the cross-cutting layers — shredding (PII encryption),
// lineage (correlation/causation), and tracing. Composes the stack in
// its constructor so the composition root stays a single `new`.
export class ApplicationEventStore extends TracingEventStore {
  constructor(
    inner: EventStore & Events,
    keys: DataKeys,
    pii: PiiFields,
    private readonly lineage: Lineage,
  ) {
    super(new ShreddingEventStore(inner, keys, pii, 'vendorId'));
  }

  override append(
    streamId: string,
    events: DomainEvent[],
    expectedStreamPosition: number,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    // Stamp the active lineage onto the append. Outside a dispatch there is no
    // lineage, so add nothing — staying a faithful EventStore that fabricates
    // no empty metadata where the base store has none.
    const ids = this.lineage.current();
    const merged = metadata || ids ? { ...metadata, ...ids } : undefined;
    return super.append(streamId, events, expectedStreamPosition, merged);
  }
}
