import { Events, Projection, Processor, Subscription } from '@market-monster/event-sourcing';
import { InMemoryCheckpoint } from './in-memory.checkpoint';

export class InMemorySubscription implements Subscription {
  private readonly checkpoint: InMemoryCheckpoint;

  constructor(
    private readonly name: string,
    private readonly events: Events,
    private readonly handler: Projection | Processor,
  ) {
    this.checkpoint = new InMemoryCheckpoint(name);
  }

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
