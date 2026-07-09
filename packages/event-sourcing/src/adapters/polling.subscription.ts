import { Checkpoint } from '../ports/checkpoint';
import { EventHandler } from '../ports/event-handler';
import { Events } from '../ports/events';
import { StoredEvent } from '../domain/stored-event';
import { Subscription } from '../ports/subscription';
import { UnitOfWork } from '../ports/unit-of-work';

const BATCH_SIZE = 100;

export class PollingSubscription implements Subscription {
  constructor(
    private readonly events: Events,
    private readonly handler: EventHandler,
    private readonly checkpoint: Checkpoint,
    private readonly unitOfWork: UnitOfWork = UnitOfWork.none(),
  ) {}

  async poll(): Promise<void> {
    let batch: StoredEvent[];
    do {
      const position = await this.checkpoint.read();
      batch = await this.events.loadFrom(position, BATCH_SIZE);
      for (const event of batch) {
        // handle + checkpoint commit atomically: a throw rolls both back, so a poison
        // event never advances the checkpoint and replays forever (Subscriptions'
        // backoff only slows it). Per-event dead-lettering — retry K times, then record
        // the event and write the checkpoint past it — needs a durable attempt count,
        // so it lands with Postgres, not in-memory.
        await this.unitOfWork.transaction(async () => {
          if (this.handler.eventTypes().includes(event.type)) {
            await this.handler.handle(event);
          }
          await this.checkpoint.write(event.globalPosition);
        });
      }
    } while (batch.length === BATCH_SIZE);
  }
}
