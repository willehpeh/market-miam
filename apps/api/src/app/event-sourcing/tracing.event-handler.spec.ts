import { beforeEach, describe, expect, it } from 'vitest';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import { EventHandler, StoredEvent } from '@market-monster/event-sourcing';
import { TracingEventHandler } from './tracing.event-handler';
import { registerSpanCapture } from '../testing/span-capture';

const exporter = registerSpanCapture();
const tracer = trace.getTracer('test');

class StubHandler implements EventHandler {
  constructor(private readonly behaviour: () => Promise<void> = () => Promise.resolve()) {}

  eventTypes(): string[] {
    return ['TestEvent'];
  }

  handle(): Promise<void> {
    return this.behaviour();
  }
}

function storedEvent(metadata?: Record<string, unknown>): StoredEvent {
  return {
    id: 'event-1',
    streamId: 'test-stream',
    type: 'TestEvent',
    payload: {},
    streamPosition: 1,
    globalPosition: 1,
    timestamp: Date.now(),
    metadata,
  };
}

function handleSpan() {
  return exporter
    .getFinishedSpans()
    .find((span) => span.name === 'event-handler handle');
}

describe('TracingEventHandler', () => {
  beforeEach(() => exporter.reset());

  it('handles the event on a new trace, linked back to the producer, with blind attributes', async () => {
    const producer = tracer.startSpan('producer');
    const producerContext = producer.spanContext();
    producer.end();
    const traceparent = `00-${producerContext.traceId}-${producerContext.spanId}-01`;

    await new TracingEventHandler(new StubHandler()).handle(
      storedEvent({ traceparent, vendorId: 'vendor-1' }),
    );

    const span = handleSpan();
    expect(span?.spanContext().traceId).not.toBe(producerContext.traceId);
    expect(span?.links.map((link) => link.context.traceId)).toEqual([producerContext.traceId]);
    expect(span?.attributes).toEqual({
      'event.type': 'TestEvent',
      'vendor.id': 'vendor-1',
      'processing.lag_ms': expect.any(Number),
    });
  });

  it.each([
    ['no traceparent', undefined],
    ['no traceparent in metadata', {}],
    ['a malformed traceparent', { traceparent: 'not-a-real-traceparent' }],
  ])('handles the event on its own trace with no link given %s', async (_label, metadata) => {
    await new TracingEventHandler(new StubHandler()).handle(storedEvent(metadata));

    expect(handleSpan()?.links).toEqual([]);
  });

  it('records the exception and rethrows when the inner handler fails', async () => {
    const handler = new TracingEventHandler(
      new StubHandler(() => Promise.reject(new Error('projection boom'))),
    );

    await expect(handler.handle(storedEvent())).rejects.toThrow('projection boom');

    const span = handleSpan();
    expect(span?.status.code).toBe(SpanStatusCode.ERROR);
    expect(span?.attributes['exception.slug']).toBe('event-handler-failed');
    expect(span?.events.map((event) => event.name)).toContain('exception');
  });
});
