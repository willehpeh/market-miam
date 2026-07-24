import { beforeEach, describe, expect, it } from 'vitest';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import { Subscription } from '@market-miam/event-sourcing';
import { TracingSubscription } from './subscription';
import { registerSpanCapture } from '../../testing/span-capture';

const exporter = registerSpanCapture();
const tracer = trace.getTracer('test');

class StubSubscription implements Subscription {
  constructor(private readonly behaviour: () => Promise<void> = () => Promise.resolve()) {}

  poll(): Promise<void> {
    return this.behaviour();
  }
}

function spanNames() {
  return exporter.getFinishedSpans().map((span) => span.name);
}

function pollSpan() {
  return exporter.getFinishedSpans().find((span) => span.name === 'subscription poll');
}

describe('TracingSubscription', () => {
  beforeEach(() => exporter.reset());

  it('polls on its own trace, named for the subscription and gauged for lag', async () => {
    await new TracingSubscription(new StubSubscription(), 'catalogue', () => Promise.resolve(7)).poll();

    expect(spanNames()).toEqual(['subscription poll']);
    expect(pollSpan()?.attributes).toEqual({
      'subscription.name': 'catalogue',
      'subscription.lag': 7,
    });
  });

  it('collapses the whole cycle to that one span, suppressing instrumentation raised inside', async () => {
    const probingPoll = new StubSubscription(async () => {
      tracer.startSpan('pg.query:SELECT checkpoints').end();
      tracer.startSpan('pg.query:SELECT events').end();
    });
    // The lag read is itself a query — it must be suppressed too, or the gauge
    // reintroduces the span volume the suppression exists to remove.
    const gaugeThatQueries = () => {
      tracer.startSpan('pg.query:SELECT head').end();
      return Promise.resolve(0);
    };

    await new TracingSubscription(probingPoll, 'catalogue', gaugeThatQueries).poll();

    expect(spanNames()).toEqual(['subscription poll']);
  });

  it('polls anyway, marking the gauge unavailable, when reading lag fails', async () => {
    const subscription = new TracingSubscription(
      new StubSubscription(),
      'catalogue',
      () => Promise.reject(new Error('head query failed')),
    );

    await expect(subscription.poll()).resolves.toBeUndefined();

    expect(pollSpan()?.attributes).toEqual({
      'subscription.name': 'catalogue',
      'subscription.lag_unavailable': true,
    });
  });

  it('records the exception and rethrows when the poll fails', async () => {
    const subscription = new TracingSubscription(
      new StubSubscription(() => Promise.reject(new Error('store unreachable'))),
      'catalogue',
      () => Promise.resolve(0),
    );

    await expect(subscription.poll()).rejects.toThrow('store unreachable');

    const span = pollSpan();
    expect(span?.status.code).toBe(SpanStatusCode.ERROR);
    expect(span?.attributes['exception.slug']).toBe('subscription-poll-failed');
    expect(span?.events.map((event) => event.name)).toContain('exception');
  });
});
