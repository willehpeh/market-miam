import { EventEnvelope, EventStore, StoredEvent } from 'packages/event-sourcing/src';

export class InMemoryEventStore implements EventStore {

  private events: StoredEvent[] = [];

  append(streamId: string, envelopes: EventEnvelope[], expectedStreamPosition: number): Promise<void> {
    const stream = this.events.filter(e => e.streamId === streamId);
    if (stream.length !== expectedStreamPosition) {
      return Promise.reject(new Error(`Expected stream position ${expectedStreamPosition}, but stream is at ${stream.length}`));
    }

    this.events.push(...this.storedEventsFromEnvelopes(envelopes, streamId, stream));
    return Promise.resolve();
  }

  load(streamId: string): Promise<StoredEvent[]> {
    return Promise.resolve(this.events.filter(e => e.streamId === streamId));
  }

  seedWith(streamId: string, envelopes: EventEnvelope[]): void {
    const stream = this.events.filter(e => e.streamId === streamId);
    this.events.push(...this.storedEventsFromEnvelopes(envelopes, streamId, stream));
  }

  private storedEventsFromEnvelopes(envelopes: EventEnvelope[], streamId: string, stream: StoredEvent[]) {
    return envelopes.map((envelope, index) => ({
      streamId,
      ...envelope.event,
      ...envelope.metadata ? { metadata: envelope.metadata } : {},
      streamPosition: stream.length + index + 1,
      globalPosition: this.events.length + index + 1,
      timestamp: Date.now(),
    }));
  }

  allEvents(): StoredEvent[] {
    return [...this.events];
  }

}
