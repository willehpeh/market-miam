import { StoredEvent } from './stored-event';

export abstract class Events {
  abstract loadFrom(globalPosition: number): Promise<StoredEvent[]>;
}
