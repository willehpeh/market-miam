import type { Command } from '@nestjs/cqrs';

export abstract class CommandGateway {
  abstract execute<R>(command: Command<R>): Promise<R>;
}
