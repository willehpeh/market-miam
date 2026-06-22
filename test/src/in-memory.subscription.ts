import { Checkpoint, EventHandler, Events, Subscription } from '@market-monster/event-sourcing';

export class InMemorySubscription implements Subscription {
  constructor(
    private readonly events: Events,
    private readonly handler: EventHandler,
    private readonly checkpoint: Checkpoint,
  ) {}

  async poll(): Promise<void> {
    const position = await this.checkpoint.read();
    const events = await this.events.loadFrom(position);
    for (const event of events) {
      if (this.handler.eventTypes().includes(event.type)) {
        await this.handler.handle(event);
      }
      await this.checkpoint.write(event.globalPosition);
    }
  }
}
