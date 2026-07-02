import { Checkpoint } from './checkpoint';
import { EventHandler } from './event-handler';
import { Events } from './events';
import { Subscription } from './subscription';

export class InMemorySubscription implements Subscription {
  constructor(
    private readonly events: Events,
    private readonly handler: EventHandler,
    private readonly checkpoint: Checkpoint,
  ) {}

  async poll(): Promise<void> {
    const position = await this.checkpoint.read();
    const events = await this.events.loadFrom(position, 100);
    for (const event of events) {
      // ponytail: dead-letter seam. A throw here never advances the checkpoint, so
      // a poison event replays forever (the runner's backoff only slows it). With a
      // durable store, wrap this handle: retry the event K times, then dead-letter
      // it and write the checkpoint past it so the stream keeps moving. Needs a
      // durable per-event attempt count, so it lands with Postgres, not in-memory.
      if (this.handler.eventTypes().includes(event.type)) {
        await this.handler.handle(event);
      }
      await this.checkpoint.write(event.globalPosition);
    }
  }
}
