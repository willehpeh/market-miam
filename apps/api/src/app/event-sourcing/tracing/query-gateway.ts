import { Injectable } from '@nestjs/common';
import { Query, QueryBus } from '@nestjs/cqrs';
import { trace } from '@opentelemetry/api';
import { QueryGateway, withSpan } from '@market-miam/event-sourcing';

const tracer = trace.getTracer('query-gateway');

@Injectable()
export class TracingQueryGateway implements QueryGateway {
  constructor(private readonly queryBus: QueryBus) {}

  execute<R>(query: Query<R>): Promise<R> {
    return tracer.startActiveSpan(query.constructor.name, (span) => {
      span.setAttribute('query.name', query.constructor.name);
      return withSpan(span, 'query-dispatch-failed', () => this.queryBus.execute(query));
    });
  }
}
