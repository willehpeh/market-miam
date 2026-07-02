import { Checkpoint } from './checkpoint';
import { EventHandler } from './event-handler';
import { Events } from './events';
import { StoredEvent } from './stored-event';
import { Subscription } from './subscription';

const BATCH_SIZE = 100;

export class InMemorySubscription implements Subscription {
  constructor(
    private readonly events: Events,
    private readonly handler: EventHandler,
    private readonly checkpoint: Checkpoint,
  ) {}

  async poll(): Promise<void> {
    let batch: StoredEvent[];
    do {
      const position = await this.checkpoint.read();
      batch = await this.events.loadFrom(position, BATCH_SIZE);
      for (const event of batch) {
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
    } while (batch.length === BATCH_SIZE);
  }
}
