import { isSpanContextValid, Span, trace } from '@opentelemetry/api';
import { DataKeys } from '../ports/data-keys';
import { DomainEvent } from '../domain/domain-event';
import { Events } from '../ports/events';
import { EventStore } from '../ports/event-store';
import { Lineage } from '../ports/lineage';
import { StoredEvent } from '../domain/stored-event';
import { PiiFields, ShreddingEventStore } from './shredding.event-store';
import { withSpan } from './with-span';

const tracer = trace.getTracer('event-store');

// With no SDK registered the tracer is a no-op whose spans carry the W3C
// invalid all-zero context — not a trace id to persist into the log.
function traceparentOf(span: Span): string | undefined {
  const { traceId, spanId, traceFlags } = span.spanContext();
  if (!isSpanContextValid(span.spanContext())) {
    return undefined;
  }
  return `00-${traceId}-${spanId}-${traceFlags.toString(16).padStart(2, '0')}`;
}

// The event store an application should be wired to: a leaf adapter (in-memory or
// postgres) behind PII shredding, with the cross-cutting stamps — lineage
// (correlation/causation) and tracing (span per append/load, traceparent into
// metadata) — applied inline. Tracing and lineage carry their own off switches
// (no SDK → no-op tracer, no dispatch → no ids), so neither needs a seam of its
// own; shredding stays a separate object for its isolated crypto tests.
export class ApplicationEventStore extends EventStore implements Events {
  private readonly store: ShreddingEventStore;

  constructor(inner: EventStore & Events, keys: DataKeys, pii: PiiFields, private readonly lineage: Lineage) {
    super();
    this.store = new ShreddingEventStore(inner, keys, pii, 'vendorId');
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
