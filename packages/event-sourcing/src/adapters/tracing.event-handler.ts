import { context, isSpanContextValid, Span, SpanContext, trace } from '@opentelemetry/api';
import { unsuppressTracing } from '@opentelemetry/core';
import { EventHandler } from '../ports/event-handler';
import { StoredEvent } from '../domain/stored-event';
import { withSpan } from './with-span';

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
      (span: Span) => {
        span.setAttributes({
          'event.type': event.type,
          'processing.lag_ms': Date.now() - event.timestamp,
          'vendor.id': event.metadata?.['vendorId'] as string,
          // The same names the dispatch spans carry, so one correlation-id
          // query follows a request across the commit boundary.
          'app.correlation_id': event.metadata?.['correlationId'] as string,
          'app.causation_id': event.metadata?.['causationId'] as string,
        });
        return withSpan(span, 'event-handler-failed', async () => this.inner.handle(event));
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
  const producer: SpanContext = { traceId, spanId, traceFlags: parseInt(flags, 16), isRemote: true };
  // All-zero ids are well-formed but invalid per W3C — degrade to no link,
  // same as a malformed traceparent.
  return isSpanContextValid(producer) ? producer : undefined;
}
