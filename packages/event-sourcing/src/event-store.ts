import { DomainEvent } from './domain-event';
import { StoredEvent } from './stored-event';

export abstract class EventStore {
  abstract append(streamId: string, events: DomainEvent[], expectedStreamPosition: number, metadata?: Record<string, unknown>): Promise<void>;
  abstract load(streamId: string): Promise<StoredEvent[]>;
}
