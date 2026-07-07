import { Injectable } from '@nestjs/common';
import { Command, CommandBus } from '@nestjs/cqrs';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import { CommandDispatcher, MessageContext } from '@market-miam/event-sourcing';

const tracer = trace.getTracer('command-dispatcher');

@Injectable()
export class TracingCommandDispatcher implements CommandDispatcher {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly context: MessageContext,
  ) {}

  execute<R>(command: Command<R>): Promise<R> {
    return tracer.startActiveSpan(command.constructor.name, async (span) => {
      const lineage = this.context.current();
      span.setAttributes({
        'command.name': command.constructor.name,
        ...(lineage && {
          'app.correlation_id': lineage.correlationId,
          'app.causation_id': lineage.causationId,
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
