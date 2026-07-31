import { Span, trace } from '@opentelemetry/api';
import { DomainEvent, Events, EventStore, StoredEvent } from '@market-miam/event-sourcing';
import { withSpan } from './with-span';

const tracer = trace.getTracer('event-store');

function traceparentOf(span: Span): string {
  const { traceId, spanId, traceFlags } = span.spanContext();
  return `00-${traceId}-${spanId}-${traceFlags.toString(16).padStart(2, '0')}`;
}

export class TracingEventStore extends EventStore implements Events {
  constructor(private readonly inner: EventStore & Events) {
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
      const enrichedMetadata = { ...metadata, traceparent: traceparentOf(span) };
      return withSpan(span, 'event-store-append-failed', () =>
        this.inner.append(streamId, events, expectedStreamPosition, enrichedMetadata),
      );
    });
  }

  load(streamId: string): Promise<StoredEvent[]> {
    return tracer.startActiveSpan('event-store load', (span) =>
      withSpan(span, 'event-store-load-failed', async () => {
        const events = await this.inner.load(streamId);
        span.setAttributes({
          stream_id: streamId,
          'event.count': events.length,
        });
        return events;
      }),
    );
  }

  loadFrom(globalPosition: number, limit: number): Promise<StoredEvent[]> {
    return this.inner.loadFrom(globalPosition, limit);
  }

  head(): Promise<number> {
    return this.inner.head();
  }
}
