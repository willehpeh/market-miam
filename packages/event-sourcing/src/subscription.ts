import { Events } from './events';
import { Projection } from './projection';
import { Processor } from './processor';

export abstract class Checkpoint {
  protected constructor(readonly name: string) {}

  abstract read(): Promise<number>;
  abstract write(position: number): Promise<void>;
}

export class Subscription {
  constructor(
    private readonly name: string,
    private readonly events: Events,
    private readonly handler: Projection | Processor,
    private readonly checkpoint: Checkpoint,
  ) {}

  async poll(): Promise<void> {
    const position = await this.checkpoint.read();
    const events = await this.events.loadFrom(position);
    for (const event of events.filter(event => this.handler.eventTypes().includes(event.type))) {
      await this.handler.handle(event);
      await this.checkpoint.write(event.globalPosition);
    }
  }
}
