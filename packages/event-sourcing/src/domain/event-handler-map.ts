import { DomainEvent, EventOfType } from './domain-event';
import { StoredEvent } from './stored-event';

export type HandlerFor<E extends DomainEvent = DomainEvent> = (event: StoredEvent<E>) => Promise<void>;

export type EventHandlerMap<T extends DomainEvent = DomainEvent> = {
  [K in T['type']]: HandlerFor<EventOfType<T, K>>;
};
