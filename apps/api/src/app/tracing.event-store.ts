import { Span, SpanStatusCode, trace } from '@opentelemetry/api';
import { DomainEvent, EventStore, StoredEvent } from '@market-monster/event-sourcing';

const tracer = trace.getTracer('event-store');

// W3C traceparent: version-traceid-spanid-flags (e.g. 00-<32hex>-<16hex>-01).
function traceparentOf(span: Span): string {
  const { traceId, spanId, traceFlags } = span.spanContext();
  return `00-${traceId}-${spanId}-${traceFlags.toString(16).padStart(2, '0')}`;
}

// Outermost store decorator, composed at the app edge: it observes append as a
// span nested under the active dispatch span. Payload-blind — it reads only
// append's own arguments (stream id, the event types/count, the vendorId
// already carried in metadata), never the event payloads. This keeps the
// event-sourcing package OTel-free and generic; the OTel dependency lives here.
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
      const vendorId = metadata?.['vendorId'];
      span.setAttributes({
        'event.type': events[0]?.type,
        'event.count': events.length,
        stream_id: streamId,
        ...(typeof vendorId === 'string' ? { 'vendor.id': vendorId } : undefined),
      });
      // Persist the producing trace context so an async consumer can link a new
      // trace back to it (ADR 0026). This is the W3C string projection of the
      // span — never the live span; replay tolerates its absence.
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
