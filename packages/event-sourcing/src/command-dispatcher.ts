import type { Command } from '@nestjs/cqrs';

export abstract class CommandDispatcher {
  abstract execute<R>(command: Command<R>): Promise<R>;
}
