import { StoredEvent } from '../domain/stored-event';

export abstract class EventHandler {
  abstract handle(event: StoredEvent): void | Promise<void>;
  abstract eventTypes(): string[];
}
