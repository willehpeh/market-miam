import { Injectable } from '@nestjs/common';
import { Command, CommandBus } from '@nestjs/cqrs';
import { trace } from '@opentelemetry/api';
import { MessageContext } from '@market-monster/event-sourcing';

const tracer = trace.getTracer('command-dispatcher');

// The one seam through which commands are dispatched, so every command is
// uniformly traced regardless of origin (HTTP today, processors later). It
// decorates the real CommandBus rather than replacing it: handlers register on
// the framework's own bus, this only wraps execute(). The span is payload-blind
// — it reads the command's constructor name and the ambient MessageContext,
// never the command's fields (see O11Y-PLAN.md attribute policy).
@Injectable()
export class CommandDispatcher {
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
      } finally {
        span.end();
      }
    });
  }
}
