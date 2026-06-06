import { StoredEvent } from './stored-event';

export abstract class EventHandler {
  abstract handle(event: StoredEvent): void | Promise<void>;
  abstract eventTypes(): string[];
}
