import { describe, expect, it } from 'vitest';
import {
  ApplicationEventStore,
  DomainEvent,
  Events,
  EventStore,
  InMemoryDataKeys,
  Lineage,
  StoredEvent,
} from '@market-miam/event-sourcing';

// Deliberately no registerSpanCapture: this file pins the no-SDK case, where the
// global tracer is a no-op whose spans carry the W3C invalid all-zero context.
// The valid-SDK stamping path is pinned by command-gateway.spec.ts.

class RecordingStore extends EventStore implements Events {
  readonly appendedMetadata: (Record<string, unknown> | undefined)[] = [];

  append(
    _streamId: string,
    _events: DomainEvent[],
    _expectedStreamPosition: number,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    this.appendedMetadata.push(metadata);
    return Promise.resolve();
  }

  load(): Promise<StoredEvent[]> {
    return Promise.resolve([]);
  }

  loadFrom(): Promise<StoredEvent[]> {
    return Promise.resolve([]);
  }

  head(): Promise<number> {
    return Promise.resolve(0);
  }
}

const event: DomainEvent = { type: 'TestEvent', payload: {}, version: 1 };

const composed = (inner: EventStore & Events) =>
  new ApplicationEventStore(inner, new InMemoryDataKeys(), {}, new Lineage());

describe('ApplicationEventStore without a tracing SDK', () => {
  it('does not persist the no-op tracer’s invalid all-zero context as a traceparent', async () => {
    const inner = new RecordingStore();

    await composed(inner).append('stream-1', [event], 0, { vendorId: 'vendor-1' });

    expect(inner.appendedMetadata).toEqual([{ vendorId: 'vendor-1' }]);
  });

  it('stays a faithful EventStore: absent metadata stays absent', async () => {
    const inner = new RecordingStore();

    await composed(inner).append('stream-1', [event], 0);

    expect(inner.appendedMetadata).toEqual([undefined]);
  });
});
