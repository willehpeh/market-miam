import { DomainEvent } from '../domain/domain-event';
import { StoredEvent } from '../domain/stored-event';

export abstract class EventStore {
  // expectedStreamPosition is a position promise, not just a concurrency check:
  // the check pins the stream's length to it, and positions are dense and
  // 1-based, so the batch occupies expectedStreamPosition + 1 through
  // expectedStreamPosition + events.length. ShreddingEventStore seals these
  // positions into its AAD before the leaf assigns them — a store that broke
  // this promise would make PII permanently unreadable.
  abstract append(streamId: string, events: DomainEvent[], expectedStreamPosition: number, metadata?: Record<string, unknown>): Promise<void>;
  abstract load(streamId: string): Promise<StoredEvent[]>;
}
