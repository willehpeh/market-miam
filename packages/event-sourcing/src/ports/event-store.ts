import { DomainEvent } from '../domain/domain-event';
import { StoredEvent } from '../domain/stored-event';

export abstract class EventStore {
  abstract append(streamId: string, events: DomainEvent[], expectedStreamPosition: number, metadata?: Record<string, unknown>): Promise<void>;
  abstract load(streamId: string): Promise<StoredEvent[]>;
}
