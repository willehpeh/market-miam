import { DomainEvent } from '@market-monster/event-sourcing';

export abstract class Aggregate {

  private _raisedEvents: DomainEvent[] = [];

  abstract apply(event: DomainEvent): void;

  raisedEvents(): DomainEvent[] {
    return this._raisedEvents.slice();
  }

  rehydrate(events: DomainEvent[]) {
    events.forEach(event => this.apply(event))
    return this;
  }

  protected raise(event: DomainEvent) {
    this.apply(event);
    this._raisedEvents.push(event);
  }
}
