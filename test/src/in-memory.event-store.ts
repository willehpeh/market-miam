import { EventEnvelope, EventStore, StoredEvent } from 'packages/event-sourcing/src';

export class InMemoryEventStore implements EventStore {

  private seededEvents: StoredEvent[] = [];
  private appendedEvents: StoredEvent[] = [];

  append(streamId: string, envelopes: EventEnvelope[], expectedStreamPosition: number): Promise<void> {
    const stream = this.allEvents().filter(e => e.streamId === streamId);
    if (stream.length !== expectedStreamPosition) {
      return Promise.reject(new Error(`Expected stream position ${expectedStreamPosition}, but stream is at ${stream.length}`));
    }

    this.appendedEvents.push(...this.storedEventsFromEnvelopes(envelopes, streamId, stream));
    return Promise.resolve();
  }

  load(streamId: string): Promise<StoredEvent[]> {
    return Promise.resolve(this.allEvents().filter(e => e.streamId === streamId));
  }

  seedWith(streamId: string, envelopes: EventEnvelope[]): void {
    const stream = this.allEvents().filter(e => e.streamId === streamId);
    this.seededEvents.push(...this.storedEventsFromEnvelopes(envelopes, streamId, stream));
  }

  private storedEventsFromEnvelopes(envelopes: EventEnvelope[], streamId: string, stream: StoredEvent[]) {
    return envelopes.map((envelope, index) => ({
      streamId,
      ...envelope.event,
      ...envelope.metadata ? { metadata: envelope.metadata } : {},
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

}
