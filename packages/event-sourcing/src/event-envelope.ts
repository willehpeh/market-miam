import { DomainEvent } from './domain-event';

export type EventEnvelope = {
  event: DomainEvent;
  metadata?: Record<string, unknown>;
};
