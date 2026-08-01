import { describe, expect, it } from 'vitest';
import type { Pool, PoolClient, QueryResult } from 'pg';
import { PostgresUnitOfWork } from '@market-miam/event-sourcing';

// A pg Pool faked at the wire: every statement lands in `statements`, and COMMIT's
// command tag is scriptable — Postgres resolves COMMIT on an aborted transaction
// successfully with a ROLLBACK tag, which no real driver call can be forced into
// deterministically from a fast test.
function fakePool(commitTag = 'COMMIT') {
  const statements: string[] = [];
  let released = 0;
  let connections = 0;
  const client = {
    query: (text: string) => {
      statements.push(text);
      const command = text === 'COMMIT' ? commitTag : text;
      return Promise.resolve({ command, rows: [] } as unknown as QueryResult);
    },
    release: () => {
      released++;
    },
  } as unknown as PoolClient;
  const pool = {
    connect: () => {
      connections++;
      return Promise.resolve(client);
    },
    // Pool-level statements are tagged so a test can tell routing-to-the-pool
    // apart from routing-to-a-transaction's-client.
    query: (text: string) => {
      statements.push(`pool:${text}`);
      return Promise.resolve({ command: text, rows: [] } as unknown as QueryResult);
    },
  } as unknown as Pool;
  return { pool, client, statements, releasedTimes: () => released, connections: () => connections };
}

describe('PostgresUnitOfWork', () => {
  it('commits the work and returns its result', async () => {
    const { pool, statements } = fakePool();

    const result = await new PostgresUnitOfWork(pool).transaction(async () => 'done');

    expect(result).toBe('done');
    expect(statements).toEqual(['BEGIN', 'COMMIT']);
  });

  it('rolls back and rethrows when the work throws', async () => {
    const { pool, statements, releasedTimes } = fakePool();

    await expect(
      new PostgresUnitOfWork(pool).transaction(async () => {
        throw new Error('handler failed');
      }),
    ).rejects.toThrow('handler failed');

    expect(statements).toEqual(['BEGIN', 'ROLLBACK']);
    expect(releasedTimes()).toBe(1);
  });

  it('throws when COMMIT resolves with a ROLLBACK tag instead of reporting success', async () => {
    // An error swallowed inside the transaction aborts it without rethrowing; the
    // verified commit (ADR 0034) is the only thing that stops that reading as durable.
    const { pool, releasedTimes } = fakePool('ROLLBACK');

    await expect(new PostgresUnitOfWork(pool).transaction(async () => 'done')).rejects.toThrow(
      'unit of work was rolled back: COMMIT returned ROLLBACK',
    );
    expect(releasedTimes()).toBe(1);
  });

  it('inTransaction outside a transaction owns one: BEGIN, the work, verified COMMIT', async () => {
    const { pool, client, statements, releasedTimes } = fakePool();
    const handed: PoolClient[] = [];

    await new PostgresUnitOfWork(pool).inTransaction(async (c) => {
      handed.push(c);
      await c.query('WORK');
    });

    expect(handed).toEqual([client]);
    expect(statements).toEqual(['BEGIN', 'WORK', 'COMMIT']);
    expect(releasedTimes()).toBe(1);
  });

  it('inTransaction inside a transaction joins it: same client, no second BEGIN/COMMIT', async () => {
    const { pool, client, statements } = fakePool();
    const uow = new PostgresUnitOfWork(pool);

    await uow.transaction(async () => {
      await uow.inTransaction(async (c) => {
        expect(c).toBe(client);
        await c.query('WORK');
      });
    });

    expect(statements).toEqual(['BEGIN', 'WORK', 'COMMIT']);
  });

  it('a nested transaction() joins the ambient one: one client, one BEGIN/COMMIT', async () => {
    const { pool, statements, connections } = fakePool();
    const uow = new PostgresUnitOfWork(pool);

    const result = await uow.transaction(async () => {
      return uow.transaction(async () => {
        await uow.query('WORK');
        return 'inner';
      });
    });

    expect(result).toBe('inner');
    expect(connections()).toBe(1);
    expect(statements).toEqual(['BEGIN', 'WORK', 'COMMIT']);
  });

  it('an outer throw discards work done under a nested transaction()', async () => {
    // The W4 footgun: before ADR 0037 the inner transaction() committed on its own
    // second connection, surviving an outer rollback the caller believed covered it.
    const { pool, statements } = fakePool();
    const uow = new PostgresUnitOfWork(pool);

    await expect(
      uow.transaction(async () => {
        await uow.transaction(async () => {
          await uow.query('WORK');
        });
        throw new Error('outer failed');
      }),
    ).rejects.toThrow('outer failed');

    expect(statements).toEqual(['BEGIN', 'WORK', 'ROLLBACK']);
  });

  it('query() routes to the pool outside a transaction and to its client inside one', async () => {
    const { pool, statements } = fakePool();
    const uow = new PostgresUnitOfWork(pool);

    await uow.query('OUTSIDE');
    await uow.transaction(async () => {
      await uow.query('INSIDE');
    });

    expect(statements).toEqual(['pool:OUTSIDE', 'BEGIN', 'INSIDE', 'COMMIT']);
  });

  it('rolls back an owned inTransaction when the work throws', async () => {
    const { pool, statements, releasedTimes } = fakePool();

    await expect(
      new PostgresUnitOfWork(pool).inTransaction(async () => {
        throw new Error('append failed');
      }),
    ).rejects.toThrow('append failed');

    expect(statements).toEqual(['BEGIN', 'ROLLBACK']);
    expect(releasedTimes()).toBe(1);
  });
});
