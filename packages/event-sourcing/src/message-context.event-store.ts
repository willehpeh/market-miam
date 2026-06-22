import { DomainEvent } from './domain-event';
import { EventStore } from './event-store';
import { MessageContext } from './message-context';
import { StoredEvent } from './stored-event';

export class MessageContextEventStore extends EventStore {
  constructor(
    private readonly inner: EventStore,
    private readonly context: MessageContext,
  ) {
    super();
  }

  append(
    streamId: string,
    events: DomainEvent[],
    expectedStreamPosition: number,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    return this.inner.append(
      streamId,
      events,
      expectedStreamPosition,
      { ...metadata, ...this.context.current() },
    );
  }

  load(streamId: string): Promise<StoredEvent[]> {
    return this.inner.load(streamId);
  }
}
