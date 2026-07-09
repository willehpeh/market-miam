import type { Query } from '@nestjs/cqrs';

export abstract class QueryGateway {
  abstract execute<R>(query: Query<R>): Promise<R>;
}
