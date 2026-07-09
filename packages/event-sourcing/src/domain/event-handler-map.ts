import { DomainEvent } from './domain-event';
import { StoredEvent } from './stored-event';

export type EventHandlerMap<T extends DomainEvent = DomainEvent> = Record<T['type'], (event: StoredEvent) => Promise<void>>;
