import { SpanStatusCode, trace } from '@opentelemetry/api';
import { DomainEvent, EventStore, StoredEvent } from '@market-monster/event-sourcing';

const tracer = trace.getTracer('event-store');

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
      try {
        return await this.inner.append(streamId, events, expectedStreamPosition, metadata);
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
