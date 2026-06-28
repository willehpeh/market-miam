import { Span, SpanStatusCode, trace } from '@opentelemetry/api';
import { DomainEvent, EventStore, StoredEvent } from '@market-monster/event-sourcing';

const tracer = trace.getTracer('event-store');

function traceparentOf(span: Span): string {
  const { traceId, spanId, traceFlags } = span.spanContext();
  return `00-${traceId}-${spanId}-${traceFlags.toString(16).padStart(2, '0')}`;
}

export class TracingEventStore extends EventStore {
  constructor(private readonly inner: EventStore) {
    super();
  }

  append(
    streamId: string,
    events: DomainEvent[],
    expectedStreamPosition: number,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    return tracer.startActiveSpan('event-store append', async (span) => {
      span.setAttributes({
        'event.type': events[0]?.type,
        'event.count': events.length,
        stream_id: streamId,
        'vendor.id': metadata?.['vendorId'] as string,
      });
      const enrichedMetadata = { ...metadata, traceparent: traceparentOf(span) };
      try {
        return await this.inner.append(streamId, events, expectedStreamPosition, enrichedMetadata);
      } catch (error) {
        span.setAttribute('exception.slug', 'event-store-append-failed');
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  load(streamId: string): Promise<StoredEvent[]> {
    return tracer.startActiveSpan('event-store load', async (span) => {
      try {
        const events = await this.inner.load(streamId);
        span.setAttributes({
          stream_id: streamId,
          'event.count': events.length,
        });
        return events;
      } finally {
        span.end();
      }
    });
  }
}
