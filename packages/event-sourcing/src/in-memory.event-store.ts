import { randomUUID } from 'node:crypto';
import { DomainEvent } from './domain-event';
import { Events } from './events';
import { EventStore } from './event-store';
import { StoredEvent } from './stored-event';

export class InMemoryEventStore implements EventStore, Events {

  private seededEvents: StoredEvent[] = [];
  private appendedEvents: StoredEvent[] = [];

  append(streamId: string, events: DomainEvent[], expectedStreamPosition: number, metadata?: Record<string, unknown>): Promise<void> {
    const stream = this.allEvents().filter(e => e.streamId === streamId);
    if (stream.length !== expectedStreamPosition) {
      return Promise.reject(new Error(`Expected stream position ${expectedStreamPosition}, but stream is at ${stream.length}`));
    }

    this.appendedEvents.push(...this.toStoredEvents(events, streamId, stream, metadata));
    return Promise.resolve();
  }

  load(streamId: string): Promise<StoredEvent[]> {
    return Promise.resolve(this.allEvents().filter(e => e.streamId === streamId));
  }

  seedWith(streamId: string, events: DomainEvent[], metadata?: Record<string, unknown>): void {
    const stream = this.allEvents().filter(e => e.streamId === streamId);
    this.seededEvents.push(...this.toStoredEvents(events, streamId, stream, metadata));
  }

  private toStoredEvents(events: DomainEvent[], streamId: string, stream: StoredEvent[], metadata?: Record<string, unknown>) {
    return events.map((event, index) => ({
      id: randomUUID(),
      streamId,
      ...event,
      ...metadata ? { metadata } : {},
      streamPosition: stream.length + index + 1,
      globalPosition: this.allEvents().length + index + 1,
      timestamp: Date.now(),
    }));
  }

  allEvents(): StoredEvent[] {
    return [...this.seededEvents, ...this.appendedEvents];
  }

  newEvents(): StoredEvent[] {
    return [...this.appendedEvents];
  }

  lastEvent(): StoredEvent {
    return this.appendedEvents[this.appendedEvents.length - 1];
  }

  loadFrom(globalPosition: number, limit: number): Promise<StoredEvent[]> {
    return Promise.resolve(
      this.allEvents()
        .filter(event => event.globalPosition > globalPosition)
        .slice(0, limit),
    );
  }

}
