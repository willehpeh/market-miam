import { StoredEvent } from '../domain/stored-event';

// A contract, not a DI token: nothing injects an EventHandler by token and nothing
// asks `instanceof`, so this stays an interface. Contrast the ports that ARE tokens
// (EventStore, Events, Checkpoint, DataKeys, UnitOfWork, ...) — those must be
// abstract classes to survive to runtime for Nest to inject against.
export interface EventHandler {
  handle(event: StoredEvent): void | Promise<void>;
  eventTypes(): string[];
}
