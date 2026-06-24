import { StoredEvent } from './stored-event';

export abstract class Events {
  abstract loadFrom(globalPosition: number, limit: number): Promise<StoredEvent[]>;
}
