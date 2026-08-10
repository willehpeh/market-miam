import { Span, trace } from '@opentelemetry/api';
import { DomainEvent } from '../domain/domain-event';
import { Events } from '../ports/events';
import { EventStore } from '../ports/event-store';
import { Lineage } from '../ports/lineage';
import { StoredEvent } from '../domain/stored-event';
import { traceparentOf } from './traceparent';
import { traced } from './with-span';

const tracer = trace.getTracer('event-store');

export class ApplicationEventStore extends EventStore implements Events {
  constructor(
    private readonly store: EventStore & Events,
    private readonly lineage: Lineage,
  ) {
    super();
  }

  append(
    streamId: string,
    events: DomainEvent[],
    expectedStreamPosition: number,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    return traced(tracer, 'event-store append', 'event-store-append-failed', (span) => {
      span.setAttributes(this.attributesForAppend(events, streamId, metadata));

      return this.store.append(streamId, events, expectedStreamPosition, this.mergedMetadata(span, metadata));
    });
  }

  private attributesForAppend(events: DomainEvent[], streamId: string, metadata?: Record<string, unknown>) {
    return {
      'event.type': events[0]?.type,
      'event.count': events.length,
      stream_id: streamId,
      'vendor.id': metadata?.['vendorId'] as string
    };
  }

  private mergedMetadata(span: Span, metadata: Record<string, unknown> | undefined) {
    const ids = this.lineage.current();
    const traceparent = traceparentOf(span);
    return metadata || ids || traceparent
        ? { ...metadata, ...ids, ...(traceparent && { traceparent }) }
        : undefined;
  }

  load(streamId: string): Promise<StoredEvent[]> {
    return traced(tracer, 'event-store load', 'event-store-load-failed', async (span) => {
      const events = await this.store.load(streamId);
      span.setAttributes(this.attributesForLoad(streamId, events));
      return events;
    });
  }

  private attributesForLoad(streamId: string, events: StoredEvent[]) {
    return {
      stream_id: streamId,
      'event.count': events.length
    };
  }

  loadFrom(globalPosition: number, limit: number): Promise<StoredEvent[]> {
    return this.store.loadFrom(globalPosition, limit);
  }

  head(): Promise<number> {
    return this.store.head();
  }
}
