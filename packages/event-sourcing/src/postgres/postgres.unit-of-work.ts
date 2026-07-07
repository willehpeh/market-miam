import { AsyncLocalStorage } from 'node:async_hooks';
import type { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { UnitOfWork } from '../unit-of-work';
import { Queryable } from './queryable';

// A UnitOfWork backed by a real pg transaction, and the Queryable the pg adapters
// run through. transaction() opens BEGIN/COMMIT on a pooled client stashed in
// AsyncLocalStorage; query() routes to that client while inside a transaction, else
// the pool. One shared instance = one ambient transaction across every adapter that
// enlists through it.
export class PostgresUnitOfWork extends UnitOfWork implements Queryable {
  private readonly active = new AsyncLocalStorage<PoolClient>();

  constructor(private readonly pool: Pool) {
    super();
  }

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await this.active.run(client, fn);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  query<R extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]): Promise<QueryResult<R>> {
    return (this.active.getStore() ?? this.pool).query<R>(text, params);
  }
}
