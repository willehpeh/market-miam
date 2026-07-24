import { context, Span, SpanContext, SpanStatusCode, trace } from '@opentelemetry/api';
import { unsuppressTracing } from '@opentelemetry/core';
import { EventHandler, StoredEvent } from '@market-miam/event-sourcing';

const tracer = trace.getTracer('event-handler');

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
      // TracingSubscription suppresses instrumentation for the length of a poll so an
      // idle cycle costs one span. Real work is the exception to that: lift it here,
      // or handling an event would be as invisible as finding nothing to handle.
      unsuppressTracing(context.active()),
      async (span: Span) => {
        span.setAttributes({
          'event.type': event.type,
          'processing.lag_ms': Date.now() - event.timestamp,
          'vendor.id': event.metadata?.['vendorId'] as string,
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
