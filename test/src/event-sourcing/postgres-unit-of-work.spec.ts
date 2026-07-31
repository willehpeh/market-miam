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
  const pool = { connect: () => Promise.resolve(client) } as unknown as Pool;
  return { pool, client, statements, releasedTimes: () => released };
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

  it('exposes the transaction client inside a transaction, and nothing outside one', async () => {
    const { pool, client } = fakePool();
    const uow = new PostgresUnitOfWork(pool);

    expect(uow.activeClient()).toBeUndefined();
    await uow.transaction(async () => {
      expect(uow.activeClient()).toBe(client);
    });
    expect(uow.activeClient()).toBeUndefined();
  });
});
