import { DomainEvent } from './domain-event';
import { Events } from './events';
import { EventStore } from './event-store';
import { MessageContext } from './message-context';
import { StoredEvent } from './stored-event';

export class MessageContextEventStore extends EventStore implements Events {
  constructor(
    private readonly inner: EventStore & Events,
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
    // Stamp the active correlation/causation context onto the append. Outside a
    // dispatch there is no context, so add nothing — staying a faithful
    // EventStore that fabricates no empty metadata where the base store has none.
    const context = this.context.current();
    const merged = metadata || context ? { ...metadata, ...context } : undefined;
    return this.inner.append(streamId, events, expectedStreamPosition, merged);
  }

  load(streamId: string): Promise<StoredEvent[]> {
    return this.inner.load(streamId);
  }

  loadFrom(globalPosition: number, limit: number): Promise<StoredEvent[]> {
    return this.inner.loadFrom(globalPosition, limit);
  }
}
