import { trace } from '@opentelemetry/api';
import { DomainEvent } from '../domain/domain-event';
import { Events } from '../ports/events';
import { EventStore } from '../ports/event-store';
import { Lineage } from '../ports/lineage';
import { StoredEvent } from '../domain/stored-event';
import { traceparentOf } from './traceparent';
import { withSpan } from './with-span';

const tracer = trace.getTracer('event-store');

// The event store an application should be wired to: the cross-cutting stamps —
// lineage (correlation/causation) and tracing (span per append/load, traceparent
// into metadata) — applied inline over whatever store the composition root
// injects (in production: the PII shredder around a leaf adapter). Tracing and
// lineage carry their own off switches (no SDK → no-op tracer, no dispatch → no
// ids), so neither needs a seam of its own. The shredder is injected, not built
// here: which metadata key names the PII subject is application policy, and it
// stays in the composition root.
export class ApplicationEventStore extends EventStore implements Events {
  constructor(
    private readonly store: EventStore & Events,
    private readonly lineage: Lineage,
  ) {
    super();
  }

  append(
    streamId: string,
    events: DomainEvent[],
    expectedStreamPosition: number,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    return tracer.startActiveSpan('event-store append', (span) => {
      span.setAttributes({
        'event.type': events[0]?.type,
        'event.count': events.length,
        stream_id: streamId,
        'vendor.id': metadata?.['vendorId'] as string,
      });
      // Stamp the active lineage and trace context onto the append. Outside a
      // dispatch there is no lineage, and without an SDK no traceparent — add
      // nothing, staying a faithful EventStore that fabricates no empty
      // metadata where the base store has none.
      const ids = this.lineage.current();
      const traceparent = traceparentOf(span);
      const merged =
        metadata || ids || traceparent
          ? { ...metadata, ...ids, ...(traceparent && { traceparent }) }
          : undefined;
      return withSpan(span, 'event-store-append-failed', () =>
        this.store.append(streamId, events, expectedStreamPosition, merged),
      );
    });
  }

  load(streamId: string): Promise<StoredEvent[]> {
    return tracer.startActiveSpan('event-store load', (span) =>
      withSpan(span, 'event-store-load-failed', async () => {
        const events = await this.store.load(streamId);
        span.setAttributes({
          stream_id: streamId,
          'event.count': events.length,
        });
        return events;
      }),
    );
  }

  loadFrom(globalPosition: number, limit: number): Promise<StoredEvent[]> {
    return this.store.loadFrom(globalPosition, limit);
  }

  head(): Promise<number> {
    return this.store.head();
  }
}
