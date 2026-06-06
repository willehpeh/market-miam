import { StoredEvent } from './stored-event';

export abstract class Processor {
  abstract handle(event: StoredEvent): void | Promise<void>;
  abstract eventTypes(): string[];
}
