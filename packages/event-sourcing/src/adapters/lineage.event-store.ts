import { DomainEvent } from '../domain/domain-event';
import { Events } from '../ports/events';
import { EventStore } from '../ports/event-store';
import { Lineage } from '../ports/lineage';
import { StoredEvent } from '../domain/stored-event';

export class LineageEventStore extends EventStore implements Events {
  constructor(
    private readonly inner: EventStore & Events,
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
    // Stamp the active lineage onto the append. Outside a dispatch there is no
    // lineage, so add nothing — staying a faithful EventStore that fabricates
    // no empty metadata where the base store has none.
    const ids = this.lineage.current();
    const merged = metadata || ids ? { ...metadata, ...ids } : undefined;
    return this.inner.append(streamId, events, expectedStreamPosition, merged);
  }

  load(streamId: string): Promise<StoredEvent[]> {
    return this.inner.load(streamId);
  }

  loadFrom(globalPosition: number, limit: number): Promise<StoredEvent[]> {
    return this.inner.loadFrom(globalPosition, limit);
  }
}
