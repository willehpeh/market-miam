import { StoredEvent } from '../domain/stored-event';

export abstract class Events {
  abstract loadFrom(globalPosition: number, limit: number): Promise<StoredEvent[]>;

  // Highest global position the log has reached, 0 when empty. Against a consumer's
  // checkpoint this is how far behind that consumer is — the one staleness measure
  // available whether or not anything has been appended lately.
  abstract head(): Promise<number>;
}
