import { DomainEvent } from './domain-event';
import { StoredEvent } from './stored-event';

export abstract class Aggregate {

  private _currentStreamPosition = 0;
  private _raisedEvents: DomainEvent[] = [];

  abstract apply(event: DomainEvent): void;

  raisedEvents(): DomainEvent[] {
    return this._raisedEvents.slice();
  }

  currentStreamPosition(): number {
    return this._currentStreamPosition;
  }

  rehydrate(events: StoredEvent[]) {
    this._currentStreamPosition = this.latestStreamPositionFor(events);
    events.forEach(event => this.apply(event));
    return this;
  }

  private latestStreamPositionFor(events: StoredEvent[]) {
    return events.length === 0 ? 0 : events[events.length - 1].streamPosition;
  }

  protected raise(event: DomainEvent) {
    this.apply(event);
    this._raisedEvents.push(event);
  }
}
