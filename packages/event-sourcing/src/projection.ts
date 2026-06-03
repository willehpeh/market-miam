import { StoredEvent } from './stored-event';

export abstract class Projection {
  abstract handle(event: StoredEvent): void | Promise<void>;
}
