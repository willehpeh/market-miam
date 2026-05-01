import { DomainEvent } from './domain-event';

export abstract class EventStore {
  abstract append(
    events: DomainEvent[],
    expectedVersion?: number,
  ): Promise<void>;
  abstract append(event: DomainEvent, expectedVersion?: number): Promise<void>;
}
