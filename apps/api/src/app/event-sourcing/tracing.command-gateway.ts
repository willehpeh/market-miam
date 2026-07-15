import { Injectable } from '@nestjs/common';
import { Command, CommandBus } from '@nestjs/cqrs';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import { CommandGateway, Lineage } from '@market-miam/event-sourcing';

const tracer = trace.getTracer('command-gateway');

@Injectable()
export class TracingCommandGateway implements CommandGateway {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly lineage: Lineage,
  ) {}

  execute<R>(command: Command<R>): Promise<R> {
    return tracer.startActiveSpan(command.constructor.name, async (span) => {
      const ids = this.lineage.current();
      span.setAttributes({
        'command.name': command.constructor.name,
        ...(ids && {
          'app.correlation_id': ids.correlationId,
          'app.causation_id': ids.causationId,
        }),
      });
      try {
        return await this.commandBus.execute(command);
      } catch (error) {
        span.setAttribute('exception.slug', 'command-dispatch-failed');
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR });
        throw error;
      } finally {
        span.end();
      }
    });
  }
}
