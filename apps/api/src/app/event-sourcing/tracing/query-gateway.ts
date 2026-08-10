import { Injectable } from '@nestjs/common';
import { Query, QueryBus } from '@nestjs/cqrs';
import { trace } from '@opentelemetry/api';
import { QueryGateway, traced } from '@market-miam/event-sourcing';

const tracer = trace.getTracer('query-gateway');

@Injectable()
export class TracingQueryGateway implements QueryGateway {
  constructor(private readonly queryBus: QueryBus) {}

  execute<R>(query: Query<R>): Promise<R> {
    return traced(tracer, query.constructor.name, 'query-dispatch-failed', (span) => {
      span.setAttribute('query.name', query.constructor.name);
      return this.queryBus.execute(query);
    });
  }
}
