import { Span, SpanContext, SpanStatusCode, trace } from '@opentelemetry/api';
import { EventHandler, StoredEvent } from '@market-monster/event-sourcing';

const tracer = trace.getTracer('event-handler');

// Decorates a projection/processor so each consumed event is handled on its
// OWN new trace (not a child of the producer — keeps traces bounded under
// processor->command fan-out) with a span link back to the producing span,
// read from the traceparent the producer persisted. Payload-blind: reads only
// the event's type, timestamp and metadata. Keeps event-sourcing OTel-free.
export class TracingEventHandler implements EventHandler {
  constructor(private readonly inner: EventHandler) {}

  eventTypes(): string[] {
    return this.inner.eventTypes();
  }

  handle(event: StoredEvent): Promise<void> {
    const producer = producerContextOf(event.metadata);
    return tracer.startActiveSpan(
      'event-handler handle',
      { root: true, links: producer ? [{ context: producer }] : [] },
      async (span: Span) => {
        const vendorId = event.metadata?.['vendorId'];
        span.setAttributes({
          'event.type': event.type,
          'processing.lag_ms': Date.now() - event.timestamp,
          ...(typeof vendorId === 'string' ? { 'vendor.id': vendorId } : undefined),
        });
        try {
          return await this.inner.handle(event);
        } catch (error) {
          span.setAttribute('exception.slug', 'event-handler-failed');
          span.recordException(error as Error);
          span.setStatus({ code: SpanStatusCode.ERROR });
          throw error;
        } finally {
          span.end();
        }
      },
    );
  }
}

function producerContextOf(metadata?: Record<string, unknown>): SpanContext | undefined {
  const traceparent = metadata?.['traceparent'];
  if (typeof traceparent !== 'string') {
    return undefined;
  }
  const match = /^00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/.exec(traceparent);
  if (!match) {
    return undefined;
  }
  const [, traceId, spanId, flags] = match;
  return { traceId, spanId, traceFlags: parseInt(flags, 16), isRemote: true };
}
