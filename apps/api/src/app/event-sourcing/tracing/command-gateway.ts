import { Injectable } from '@nestjs/common';
import { Command, CommandBus } from '@nestjs/cqrs';
import { trace } from '@opentelemetry/api';
import { CommandGateway, Lineage, withSpan } from '@market-miam/event-sourcing';

const tracer = trace.getTracer('command-gateway');

@Injectable()
export class TracingCommandGateway implements CommandGateway {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly lineage: Lineage,
  ) {}

  execute<R>(command: Command<R>): Promise<R> {
    return tracer.startActiveSpan(command.constructor.name, (span) => {
      const ids = this.lineage.current();
      span.setAttributes({
        'command.name': command.constructor.name,
        ...(ids && {
          'app.correlation_id': ids.correlationId,
          'app.causation_id': ids.causationId,
        }),
      });
      return withSpan(span, 'command-dispatch-failed', () => this.commandBus.execute(command));
    });
  }
}
