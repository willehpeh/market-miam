import { StoredEvent } from './stored-event';
import { EventEnvelope } from './event-envelope';

export abstract class EventStore {
  abstract append(streamId: string, events: EventEnvelope[], expectedStreamPosition: number): Promise<void>;
  abstract load(streamId: string): Promise<StoredEvent[]>;
}
