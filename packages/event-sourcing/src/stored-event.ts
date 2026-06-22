import { DomainEvent } from './domain-event';

export type StoredEvent = DomainEvent & {
  id: string;
  globalPosition: number;
  streamId: string;
  streamPosition: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
};
