import { DomainEvent, EventStore, StoredEvent } from '@market-monster/event-sourcing';

export class InMemoryEventStore implements EventStore {

  events: DomainEvent[] = [];

  append(streamId: string, event: DomainEvent, expectedStreamPosition: number, metadata?: Record<string, unknown>): Promise<void> {
    this.events.push(event);
    return Promise.resolve();
  }

  load(streamId: string): Promise<StoredEvent[]> {
    return Promise.resolve([]);
  }

}
