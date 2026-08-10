import { Injectable } from '@nestjs/common';
import { Command, CommandBus } from '@nestjs/cqrs';
import { trace } from '@opentelemetry/api';
import { CommandGateway, Lineage, traced } from '@market-miam/event-sourcing';
import { commandAttributes } from '../command-attributes';

const tracer = trace.getTracer('command-gateway');

@Injectable()
export class TracingCommandGateway implements CommandGateway {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly lineage: Lineage,
  ) {}

  execute<R>(command: Command<R>): Promise<R> {
    return traced(tracer, command.constructor.name, 'command-dispatch-failed', (span) => {
      const ids = this.lineage.current();
      span.setAttributes({
        'command.name': command.constructor.name,
        ...commandAttributes(command),
        ...(ids && {
          'app.correlation_id': ids.correlationId,
          'app.causation_id': ids.causationId,
        }),
      });
      return this.commandBus.execute(command);
    });
  }
}
