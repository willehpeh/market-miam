import { DomainEvent, EventStore, StoredEvent } from 'packages/event-sourcing/src';

export class InMemoryEventStore implements EventStore {

  events: Record<string, DomainEvent[]> = {};

  append(streamId: string, events: DomainEvent[], expectedStreamPosition: number, metadata?: Record<string, unknown>): Promise<void> {
    this.events[streamId] = this.events[streamId] || [];
    this.events[streamId].push(...events);
    return Promise.resolve();
  }

  load(streamId: string): Promise<StoredEvent[]> {
    return Promise.resolve([]);
  }

  allEvents(): DomainEvent[] {
    return Object.values(this.events).flat();
  }

}
