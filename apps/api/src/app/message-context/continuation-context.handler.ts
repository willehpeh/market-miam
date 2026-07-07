import { EventHandler, MessageContext, StoredEvent } from '@market-miam/event-sourcing';

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
