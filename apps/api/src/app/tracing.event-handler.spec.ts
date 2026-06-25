import { beforeEach, describe, expect, it } from 'vitest';
import { SpanStatusCode } from '@opentelemetry/api';
import { EventHandler, StoredEvent } from '@market-monster/event-sourcing';
import { TracingEventHandler } from './tracing.event-handler';
import { registerSpanCapture } from './testing/span-capture';

const exporter = registerSpanCapture();

// A boundary fake for the decorated projection/processor — the only stub here;
// the OTel span pipeline is the real thing. The happy path (a new trace linked
// back to the producer) is covered end-to-end in storefront-consumer-tracing.spec.ts.
class StubHandler implements EventHandler {
  constructor(private readonly behaviour: () => Promise<void>) {}

  eventTypes(): string[] {
    return ['StorefrontInformationEdited'];
  }

  handle(): Promise<void> {
    return this.behaviour();
  }
}

function storedEvent(metadata?: Record<string, unknown>): StoredEvent {
  return {
    id: 'event-1',
    streamId: 'storefront-acme',
    type: 'StorefrontInformationEdited',
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

  it.each([
    ['no traceparent', undefined],
    ['no traceparent in metadata', {}],
    ['a malformed traceparent', { traceparent: 'not-a-real-traceparent' }],
  ])('handles the event on its own trace with no link given %s', async (_label, metadata) => {
    const handler = new TracingEventHandler(new StubHandler(() => Promise.resolve()));

    await handler.handle(storedEvent(metadata));

    expect(handleSpan()?.links).toEqual([]);
  });
});
