import { DomainEvent, EventStore, StoredEvent } from 'packages/event-sourcing/src';

export class InMemoryEventStore implements EventStore {

  private streams: Record<string, StoredEvent[]> = {};
  private globalPosition = 0;

  append(streamId: string, events: DomainEvent[], expectedStreamPosition: number, metadata?: Record<string, unknown>): Promise<void> {
    const stream = this.streams[streamId] || [];
    if (stream.length !== expectedStreamPosition) {
      return Promise.reject(new Error(`Expected stream position ${expectedStreamPosition}, but stream is at ${stream.length}`));
    }

    const storedEvents = events.map((event, index) => ({
      ...event,
      streamId,
      streamPosition: stream.length + index,
      globalPosition: this.globalPosition++,
      timestamp: Date.now(),
      ...metadata ? { metadata } : {},
    }));

    this.streams[streamId] = [...stream, ...storedEvents];
    return Promise.resolve();
  }

  load(streamId: string): Promise<StoredEvent[]> {
    return Promise.resolve(this.streams[streamId] || []);
  }

  seedWith(streamId: string, ...events: DomainEvent[]): void {
    const stream = this.streams[streamId] || [];
    const storedEvents = events.map((event, index) => ({
      ...event,
      streamId,
      streamPosition: stream.length + index,
      globalPosition: this.globalPosition++,
      timestamp: Date.now(),
    }));
    this.streams[streamId] = [...stream, ...storedEvents];
  }

  allEvents(): DomainEvent[] {
    return Object.values(this.streams).flat();
  }

}
