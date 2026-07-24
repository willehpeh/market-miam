import { randomUUID } from 'node:crypto';
import { Observable, Subject } from 'rxjs';
import { ConcurrencyError } from '../../domain/concurrency.error';
import { DomainEvent } from '../../domain/domain-event';
import { Events } from '../../ports/events';
import { EventStore } from '../../ports/event-store';
import { StoredEvent } from '../../domain/stored-event';

export class InMemoryEventStore implements EventStore, Events {

  private seededEvents: StoredEvent[] = [];
  private appendedEvents: StoredEvent[] = [];
  // Mirrors PostgresNotifications' poke stream: fires "poll now" on every append so
  // subscriptions get read-after-write latency instead of waiting for the timer.
  private readonly pokes = new Subject<void>();

  append(streamId: string, events: DomainEvent[], expectedStreamPosition: number, metadata?: Record<string, unknown>): Promise<void> {
    const stream = this.allEvents().filter(e => e.streamId === streamId);
    if (stream.length !== expectedStreamPosition) {
      return Promise.reject(new ConcurrencyError(expectedStreamPosition, stream.length));
    }

    this.appendedEvents.push(...this.toStoredEvents(events, streamId, stream, metadata));
    this.pokes.next();
    return Promise.resolve();
  }

  notifications(): Observable<void> {
    return this.pokes.asObservable();
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

  private allEvents(): StoredEvent[] {
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

  head(): Promise<number> {
    const all = this.allEvents();
    return Promise.resolve(all.length === 0 ? 0 : all[all.length - 1].globalPosition);
  }

}
