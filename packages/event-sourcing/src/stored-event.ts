import { DomainEvent } from './domain-event';

export type StoredEvent = DomainEvent & {
  globalPosition: number;
  streamId: string;
  streamPosition: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
};
