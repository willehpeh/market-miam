import { DomainEvent } from './domain-event';
import { EventHandlerMap, HandlerFor } from './event-handler-map';
import { StoredEvent } from './stored-event';
import { Projection } from './projection';

export abstract class ProjectionFor<E extends DomainEvent = DomainEvent> implements Projection {
  protected abstract handlers(): EventHandlerMap<E>;

  // Abstract, not a default: a projection with a durable store behind a handler map
  // must state what a rebuild clears. Subscriptions.rebuild() resets the checkpoint to
  // zero and replays, and a replay onto an uncleared read model cannot remove a row
  // the log no longer produces — it only overwrites what the events re-assert.
  abstract reset(): Promise<void>;

  private _handlers?: EventHandlerMap<E>;

  eventTypes(): string[] {
    return Object.keys(this.map());
  }

  handle(event: StoredEvent): Promise<void> {
    return this.handlerFor(event)(event);
  }

  // Which map entry a runtime event selects is a fact the compiler cannot check, so the
  // per-event handler types widen back to the plain envelope here — and only here. Safe
  // because subscriptions filter on eventTypes() before dispatching.
  private handlerFor(event: StoredEvent): HandlerFor {
    return this.map()[event.type as E['type']] as HandlerFor;
  }

  private map(): EventHandlerMap<E> {
    return (this._handlers ??= this.handlers());
  }
}
