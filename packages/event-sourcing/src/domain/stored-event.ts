import { DomainEvent } from './domain-event';

export type StoredEvent<E extends DomainEvent = DomainEvent> = E & {
  id: string;
  globalPosition: number;
  streamId: string;
  streamPosition: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
};
