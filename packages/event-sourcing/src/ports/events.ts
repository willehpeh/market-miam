import { StoredEvent } from '../domain/stored-event';

export abstract class Events {
  abstract loadFrom(globalPosition: number, limit: number): Promise<StoredEvent[]>;
}
