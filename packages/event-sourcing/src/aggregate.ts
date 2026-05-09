import { DomainEvent } from './domain-event';

export abstract class Aggregate {

  public currentStreamPosition = 0;
  private _raisedEvents: DomainEvent[] = [];

  abstract apply(event: DomainEvent): void;

  raisedEvents(): DomainEvent[] {
    return this._raisedEvents.slice();
  }

  rehydrate(events: DomainEvent[], currentStreamPosition = 0) {
    this.currentStreamPosition = currentStreamPosition;
    events.forEach(event => this.apply(event));
    return this;
  }

  protected raise(event: DomainEvent) {
    this.apply(event);
    this._raisedEvents.push(event);
  }
}
