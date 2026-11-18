import { Command, ICommandHandler } from '@nestjs/cqrs';
import { CommandGateway } from '@market-miam/event-sourcing';

type CommandClass = new (...args: never[]) => Command<unknown>;

export class HandlingCommandGateway extends CommandGateway {
  private readonly handlers = new Map<CommandClass, ICommandHandler>();

  handling<C extends Command<unknown>>(commandClass: new (...args: never[]) => C, handler: ICommandHandler<C>): this {
    this.handlers.set(commandClass, handler);
    return this;
  }

  execute<R>(command: Command<R>): Promise<R> {
    const handler = this.handlers.get(command.constructor as CommandClass);
    if (!handler) {
      return Promise.reject(new Error(`No handler for ${command.constructor.name}`));
    }
    return handler.execute(command);
  }
}
