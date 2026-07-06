import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { randomBytes } from 'node:crypto';
import { PostgresDataKeys } from '@market-monster/event-sourcing';
import { dataKeysContract } from '../data-keys.contract';
import { PostgresHarness, startPostgres } from './testcontainer';

const MASTER_KEY = randomBytes(32);

let pg: PostgresHarness;

beforeAll(async () => {
  pg = await startPostgres();
});

afterAll(async () => {
  await pg?.stop();
});

beforeEach(async () => {
  await pg.reset();
});

dataKeysContract('PostgresDataKeys', () => new PostgresDataKeys(pg.pool, MASTER_KEY));

describe('PostgresDataKeys envelope encryption', () => {
  it('stores the data key wrapped, never in the clear', async () => {
    const dataKey = await new PostgresDataKeys(pg.pool, MASTER_KEY).getOrCreateKeyFor('vendor-1');

    const { rows } = await pg.pool.query<{ wrapped_key: Buffer }>(
      'SELECT wrapped_key FROM data_keys WHERE subject_id = $1',
      ['vendor-1'],
    );
    expect(rows[0].wrapped_key.includes(dataKey)).toBe(false);
    expect(rows[0].wrapped_key).toHaveLength(12 + 16 + 32);
  });

  it('cannot unwrap a key with the wrong master key', async () => {
    await new PostgresDataKeys(pg.pool, MASTER_KEY).getOrCreateKeyFor('vendor-1');

    await expect(new PostgresDataKeys(pg.pool, randomBytes(32)).findKeyFor('vendor-1')).rejects.toThrow();
  });

  it('serializes a concurrent first-mint into one stable key', async () => {
    const keys = new PostgresDataKeys(pg.pool, MASTER_KEY);

    const [a, b] = await Promise.all([
      keys.getOrCreateKeyFor('vendor-1'),
      keys.getOrCreateKeyFor('vendor-1'),
    ]);

    expect(a.equals(b)).toBe(true);
    const { rows } = await pg.pool.query<{ n: number }>(
      'SELECT count(*)::int AS n FROM data_keys WHERE subject_id = $1',
      ['vendor-1'],
    );
    expect(rows[0].n).toBe(1);
  });
});
