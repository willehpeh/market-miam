import { DomainEvent } from './domain-event';
import { EventHandler } from './event-handler';
import { EventHandlerMap } from './event-handler-map';
import { StoredEvent } from './stored-event';

export abstract class Projection<E extends DomainEvent = DomainEvent> extends EventHandler {
  protected abstract handlers(): EventHandlerMap<E>;
  private _handlers?: EventHandlerMap<E>;

  eventTypes(): string[] {
    return Object.keys(this.map());
  }

  handle(event: StoredEvent): Promise<void> {
    return this.map()[event.type as E['type']](event);
  }

  private map(): EventHandlerMap<E> {
    return (this._handlers ??= this.handlers());
  }
}
