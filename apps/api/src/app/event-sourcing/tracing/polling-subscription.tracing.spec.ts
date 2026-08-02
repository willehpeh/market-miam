import { beforeEach, describe, expect, it } from 'vitest';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import {
  EventHandler,
  Events,
  InMemoryCheckpoint,
  PollingSubscription,
  StoredEvent,
} from '@market-miam/event-sourcing';

import { registerSpanCapture } from '../../testing/span-capture';

const exporter = registerSpanCapture();
const tracer = trace.getTracer('test');

class StubEvents extends Events {
  constructor(
    private readonly onLoadFrom: () => Promise<StoredEvent[]> = () => Promise.resolve([]),
    private readonly onHead: () => Promise<number> = () => Promise.resolve(0),
  ) {
    super();
  }

  loadFrom(): Promise<StoredEvent[]> {
    return this.onLoadFrom();
  }

  head(): Promise<number> {
    return this.onHead();
  }
}

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
    version: 1,
    streamPosition: 1,
    globalPosition: 1,
    timestamp: Date.now(),
    metadata,
  };
}

function subscription(events: Events, handler: EventHandler = new StubHandler()) {
  return new PollingSubscription(events, handler, new InMemoryCheckpoint('sub-1'), { name: 'catalogue' });
}

function deliver(event: StoredEvent, handler?: EventHandler) {
  return subscription(new StubEvents(() => Promise.resolve([event])), handler).poll();
}

function spanNames() {
  return exporter.getFinishedSpans().map((span) => span.name);
}

function pollSpan() {
  return exporter.getFinishedSpans().find((span) => span.name === 'subscription poll');
}

function handleSpan() {
  return exporter.getFinishedSpans().find((span) => span.name === 'event-handler handle');
}

describe('PollingSubscription cycle tracing', () => {
  beforeEach(() => exporter.reset());

  it('polls on its own trace, named for the subscription and gauged for lag', async () => {
    await subscription(new StubEvents(undefined, () => Promise.resolve(7))).poll();

    expect(spanNames()).toEqual(['subscription poll']);
    expect(pollSpan()?.attributes).toEqual({
      'subscription.name': 'catalogue',
      'subscription.lag': 7,
    });
  });

  it('collapses an idle cycle to that one span, suppressing instrumentation raised inside', async () => {
    const probingEvents = new StubEvents(
      () => {
        tracer.startSpan('pg.query:SELECT events').end();
        return Promise.resolve([]);
      },
      // The lag read is itself a query — it must be suppressed too, or the gauge
      // reintroduces the span volume the suppression exists to remove.
      () => {
        tracer.startSpan('pg.query:SELECT head').end();
        return Promise.resolve(0);
      },
    );

    await subscription(probingEvents).poll();

    expect(spanNames()).toEqual(['subscription poll']);
  });

  it('polls anyway, marking the gauge unavailable, when reading lag fails', async () => {
    const headless = new StubEvents(undefined, () => Promise.reject(new Error('head query failed')));

    await expect(subscription(headless).poll()).resolves.toBeUndefined();

    expect(pollSpan()?.attributes).toEqual({
      'subscription.name': 'catalogue',
      'subscription.lag_unavailable': true,
    });
  });

  it('records the exception and rethrows when the poll fails', async () => {
    const unreachable = new StubEvents(() => Promise.reject(new Error('store unreachable')));

    await expect(subscription(unreachable).poll()).rejects.toThrow('store unreachable');

    const span = pollSpan();
    expect(span?.status.code).toBe(SpanStatusCode.ERROR);
    expect(span?.attributes['exception.slug']).toBe('subscription-poll-failed');
    expect(span?.events.map((event) => event.name)).toContain('exception');
  });
});

describe('PollingSubscription handler tracing', () => {
  beforeEach(() => exporter.reset());

  it('handles the event on a new trace, linked back to the producer, with blind attributes', async () => {
    const producer = tracer.startSpan('producer');
    const producerContext = producer.spanContext();
    producer.end();
    const traceparent = `00-${producerContext.traceId}-${producerContext.spanId}-01`;

    await deliver(
      storedEvent({ traceparent, vendorId: 'vendor-1', correlationId: 'corr-1', causationId: 'cause-1' }),
    );

    const span = handleSpan();
    expect(span?.spanContext().traceId).not.toBe(producerContext.traceId);
    expect(span?.links.map((link) => link.context.traceId)).toEqual([producerContext.traceId]);
    expect(span?.attributes).toEqual({
      'event.type': 'TestEvent',
      'vendor.id': 'vendor-1',
      'processing.lag_ms': expect.any(Number),
      'app.correlation_id': 'corr-1',
      'app.causation_id': 'cause-1',
    });
  });

  it.each([
    ['no traceparent', undefined],
    ['no traceparent in metadata', {}],
    ['a malformed traceparent', { traceparent: 'not-a-real-traceparent' }],
    // Well-formed but invalid per W3C — what a no-op tracer used to produce.
    ['an all-zero traceparent', { traceparent: `00-${'0'.repeat(32)}-${'0'.repeat(16)}-01` }],
  ])('handles the event on its own trace with no link given %s', async (_label, metadata) => {
    await deliver(storedEvent(metadata));

    expect(handleSpan()?.links).toEqual([]);
  });

  it('lifts the cycle suppression for real work: the handle span escapes, the noise does not', async () => {
    await deliver(storedEvent());

    expect(spanNames()).toEqual(['event-handler handle', 'subscription poll']);
  });

  it('records the exception and rethrows when the inner handler fails', async () => {
    const failing = new StubHandler(() => Promise.reject(new Error('projection boom')));

    await expect(deliver(storedEvent(), failing)).rejects.toThrow('projection boom');

    const span = handleSpan();
    expect(span?.status.code).toBe(SpanStatusCode.ERROR);
    expect(span?.attributes['exception.slug']).toBe('event-handler-failed');
    expect(span?.events.map((event) => event.name)).toContain('exception');
  });
});
