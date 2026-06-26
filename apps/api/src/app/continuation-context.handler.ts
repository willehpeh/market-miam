import { EventHandler, MessageContext, StoredEvent } from '@market-monster/event-sourcing';

// Wraps a processor so any command it dispatches continues the consumed event's
// business transaction: correlationId is inherited from the event, and
// causationId is the event's own id — the message that directly caused the
// dispatch. The transient command has no id of its own in the lineage.
export class ContinuationContextHandler implements EventHandler {
  constructor(
    private readonly inner: EventHandler,
    private readonly context: MessageContext,
  ) {}

  eventTypes(): string[] {
    return this.inner.eventTypes();
  }

  handle(event: StoredEvent): Promise<void> {
    const correlationId = (event.metadata?.['correlationId'] as string) ?? event.id;
    return this.context.run({ correlationId, causationId: event.id }, async () => this.inner.handle(event));
  }
}
