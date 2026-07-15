import { EventHandler, Lineage, StoredEvent } from '@market-miam/event-sourcing';

export class ContinuedLineageHandler implements EventHandler {
  constructor(
    private readonly inner: EventHandler,
    private readonly lineage: Lineage,
  ) {}

  eventTypes(): string[] {
    return this.inner.eventTypes();
  }

  handle(event: StoredEvent): Promise<void> {
    const correlationId = (event.metadata?.['correlationId'] as string) ?? event.id;
    return this.lineage.run({ correlationId, causationId: event.id }, async () => this.inner.handle(event));
  }
}
