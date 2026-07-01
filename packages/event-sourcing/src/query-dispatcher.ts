import type { Query } from '@nestjs/cqrs';

export abstract class QueryDispatcher {
  abstract execute<R>(query: Query<R>): Promise<R>;
}
