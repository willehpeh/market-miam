import type { QueryResult, QueryResultRow } from 'pg';

// The slice of pg's Pool/PoolClient our adapters run through. Pool satisfies it,
// so an adapter can take a raw Pool (tests) or a transaction-routing
// PostgresUnitOfWork (prod) interchangeably.
export interface Queryable {
  query<R extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]): Promise<QueryResult<R>>;
}
