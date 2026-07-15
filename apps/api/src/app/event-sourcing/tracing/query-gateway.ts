import { Injectable } from '@nestjs/common';
import { Query, QueryBus } from '@nestjs/cqrs';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import { QueryGateway } from '@market-miam/event-sourcing';

const tracer = trace.getTracer('query-gateway');

@Injectable()
export class TracingQueryGateway implements QueryGateway {
  constructor(private readonly queryBus: QueryBus) {}

  execute<R>(query: Query<R>): Promise<R> {
    return tracer.startActiveSpan(query.constructor.name, async (span) => {
      span.setAttribute('query.name', query.constructor.name);
      try {
        return await this.queryBus.execute(query);
      } catch (error) {
        span.setAttribute('exception.slug', 'query-dispatch-failed');
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR });
        throw error;
      } finally {
        span.end();
      }
    });
  }
}
