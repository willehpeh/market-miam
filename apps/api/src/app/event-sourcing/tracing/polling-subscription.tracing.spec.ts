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

class NoopHandler implements EventHandler {
  eventTypes(): string[] {
    return [];
  }

  handle(): Promise<void> {
    return Promise.resolve();
  }
}

function subscription(events: Events) {
  return new PollingSubscription(events, new NoopHandler(), new InMemoryCheckpoint('sub-1'), undefined, 'catalogue');
}

function spanNames() {
  return exporter.getFinishedSpans().map((span) => span.name);
}

function pollSpan() {
  return exporter.getFinishedSpans().find((span) => span.name === 'subscription poll');
}

describe('PollingSubscription tracing', () => {
  beforeEach(() => exporter.reset());

  it('polls on its own trace, named for the subscription and gauged for lag', async () => {
    await subscription(new StubEvents(undefined, () => Promise.resolve(7))).poll();

    expect(spanNames()).toEqual(['subscription poll']);
    expect(pollSpan()?.attributes).toEqual({
      'subscription.name': 'catalogue',
      'subscription.lag': 7,
    });
  });

  it('collapses the whole cycle to that one span, suppressing instrumentation raised inside', async () => {
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
