import { AsyncLocalStorage } from 'node:async_hooks';
import type { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { UnitOfWork } from '../../ports/unit-of-work';
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

  transaction<T>(fn: () => Promise<T>): Promise<T> {
    return this.ownTransaction(() => fn());
  }

  // The tell for multi-statement work that must pin one connection (an append:
  // lock, check, INSERT): run it in the ambient transaction when one exists — its
  // owner's COMMIT decides durability — or in a fresh one when none does. The
  // caller hands over the work and never learns which case applied.
  inTransaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    const ambient = this.active.getStore();
    return ambient ? work(ambient) : this.ownTransaction(work);
  }

  query<R extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]): Promise<QueryResult<R>> {
    return (this.active.getStore() ?? this.pool).query<R>(text, params);
  }

  private async ownTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await this.active.run(client, () => fn(client));
      // Postgres resolves COMMIT on an aborted transaction successfully, with a ROLLBACK
      // command tag — an error swallowed inside fn would otherwise read as a durable unit
      // of work (verified commit, ADR 0034).
      const commit = await client.query('COMMIT');
      if (commit.command !== 'COMMIT') {
        throw new Error(`unit of work was rolled back: COMMIT returned ${commit.command}`);
      }
      return result;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }
}
