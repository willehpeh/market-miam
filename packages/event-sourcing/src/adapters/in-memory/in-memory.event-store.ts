import { randomUUID } from 'node:crypto';
import { Observable, Subject } from 'rxjs';
import { ConcurrencyError } from '../../domain/concurrency.error';
import { DomainEvent } from '../../domain/domain-event';
import { Events } from '../../ports/events';
import { EventStore } from '../../ports/event-store';
import { StoredEvent } from '../../domain/stored-event';

export class InMemoryEventStore implements EventStore, Events {

  // One log is the sole source of ordering: positions are assigned from the
  // log's state at insertion, so array order and globalPosition order cannot
  // diverge no matter how seedWith and append interleave.
  private readonly log: StoredEvent[] = [];
  // References into `log` for events stored via append() — an assertion
  // affordance for specs (newEvents/lastEvent), never a source of ordering.
  private readonly appended: StoredEvent[] = [];
  // Mirrors PostgresNotifications' poke stream: fires "poll now" on every append so
  // subscriptions get read-after-write latency instead of waiting for the timer.
  private readonly pokes = new Subject<void>();

  append(streamId: string, events: DomainEvent[], expectedStreamPosition: number, metadata?: Record<string, unknown>): Promise<void> {
    const streamLength = this.streamOf(streamId).length;
    if (streamLength !== expectedStreamPosition) {
      return Promise.reject(new ConcurrencyError(expectedStreamPosition, streamLength));
    }

    this.appended.push(...events.map(event => this.store(event, streamId, metadata)));
    this.pokes.next();
    return Promise.resolve();
  }

  notifications(): Observable<void> {
    return this.pokes.asObservable();
  }

  load(streamId: string): Promise<StoredEvent[]> {
    return Promise.resolve(this.streamOf(streamId));
  }

  seedWith(streamId: string, events: DomainEvent[], metadata?: Record<string, unknown>): void {
    events.forEach(event => this.store(event, streamId, metadata));
  }

  private store(event: DomainEvent, streamId: string, metadata?: Record<string, unknown>): StoredEvent {
    const stored: StoredEvent = {
      id: randomUUID(),
      streamId,
      ...event,
      ...metadata ? { metadata } : {},
      streamPosition: this.streamOf(streamId).length + 1,
      globalPosition: this.log.length + 1,
      timestamp: Date.now(),
    };
    this.log.push(stored);
    return stored;
  }

  private streamOf(streamId: string): StoredEvent[] {
    return this.log.filter(e => e.streamId === streamId);
  }

  newEvents(): StoredEvent[] {
    return [...this.appended];
  }

  lastEvent(): StoredEvent {
    return this.appended[this.appended.length - 1];
  }

  loadFrom(globalPosition: number, limit: number): Promise<StoredEvent[]> {
    return Promise.resolve(
      this.log
        .filter(event => event.globalPosition > globalPosition)
        .slice(0, limit),
    );
  }

  head(): Promise<number> {
    return Promise.resolve(this.log.length === 0 ? 0 : this.log[this.log.length - 1].globalPosition);
  }

}
