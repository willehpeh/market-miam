import { CommandGateway } from '@market-miam/event-sourcing';
import { Command } from '@nestjs/cqrs';

// A processor's CommandGateway that only records what it was asked to dispatch.
export class RecordingCommandGateway extends CommandGateway {
  readonly dispatched: Command<unknown>[] = [];

  async execute<R>(command: Command<R>): Promise<R> {
    this.dispatched.push(command);
    return undefined as R;
  }
}
