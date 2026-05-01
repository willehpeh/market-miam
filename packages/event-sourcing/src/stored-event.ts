import { DomainEvent } from './domain-event';

export type StoredEvent = DomainEvent & {
  position: number;
  timestamp: number;
};
