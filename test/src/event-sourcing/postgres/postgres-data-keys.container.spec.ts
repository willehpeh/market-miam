import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { randomBytes } from 'node:crypto';
import { MasterKeyring, PostgresDataKeys } from '@market-miam/event-sourcing';
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

dataKeysContract('PostgresDataKeys', () => new PostgresDataKeys(pg.pool, MasterKeyring.single(MASTER_KEY)));

describe('PostgresDataKeys envelope encryption', () => {
  it('stores the data key wrapped, never in the clear', async () => {
    const dataKey = await new PostgresDataKeys(pg.pool, MasterKeyring.single(MASTER_KEY)).getOrCreateKeyFor('vendor-1');

    const { rows } = await pg.pool.query<{ wrapped_key: Buffer; key_version: number }>(
      'SELECT wrapped_key, key_version FROM data_keys WHERE subject_id = $1',
      ['vendor-1'],
    );
    expect(rows[0].wrapped_key.includes(dataKey)).toBe(false);
    expect(rows[0].wrapped_key).toHaveLength(12 + 16 + 32);
    expect(rows[0].key_version).toBe(1);
  });

  it('cannot unwrap a key with the wrong master key', async () => {
    await new PostgresDataKeys(pg.pool, MasterKeyring.single(MASTER_KEY)).getOrCreateKeyFor('vendor-1');

    await expect(
      new PostgresDataKeys(pg.pool, MasterKeyring.single(randomBytes(32))).findKeyFor('vendor-1'),
    ).rejects.toThrow();
  });

  it('serializes a concurrent first-mint into one stable key', async () => {
    const keys = new PostgresDataKeys(pg.pool, MasterKeyring.single(MASTER_KEY));

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

describe('PostgresDataKeys master key rotation', () => {
  const OLD = randomBytes(32);
  const NEW = randomBytes(32);
  // Mid-rotation ring: both keys present, new mints under version 2.
  const rotated = () => new PostgresDataKeys(pg.pool, new MasterKeyring(new Map([[1, OLD], [2, NEW]]), 2));
  // Post-retirement ring: the old key is gone.
  const retired = () => new PostgresDataKeys(pg.pool, new MasterKeyring(new Map([[2, NEW]]), 2));
  const preRotation = () => new PostgresDataKeys(pg.pool, MasterKeyring.single(OLD));

  const storedVersion = async (subjectId: string): Promise<number> => {
    const { rows } = await pg.pool.query<{ key_version: number }>(
      'SELECT key_version FROM data_keys WHERE subject_id = $1',
      [subjectId],
    );
    return rows[0].key_version;
  };

  it('unwraps a row wrapped under an old version', async () => {
    const minted = await preRotation().getOrCreateKeyFor('vendor-1');

    const found = await rotated().findKeyFor('vendor-1');

    expect(found?.equals(minted)).toBe(true);
  });

  it('re-wraps an old-version row under the current version on read', async () => {
    const minted = await preRotation().getOrCreateKeyFor('vendor-1');

    await rotated().findKeyFor('vendor-1');

    expect(await storedVersion('vendor-1')).toBe(2);
    // The re-wrapped row no longer needs the old master key — and still holds
    // the same data key, so existing event ciphertexts stay decryptable.
    const afterRetirement = await retired().findKeyFor('vendor-1');
    expect(afterRetirement?.equals(minted)).toBe(true);
  });

  it('mints new keys under the current version', async () => {
    await rotated().getOrCreateKeyFor('vendor-1');

    expect(await storedVersion('vendor-1')).toBe(2);
  });

  it('leaves a current-version row untouched on read', async () => {
    await rotated().getOrCreateKeyFor('vendor-1');
    const before = (await pg.pool.query<{ wrapped_key: Buffer }>(
      'SELECT wrapped_key FROM data_keys WHERE subject_id = $1', ['vendor-1'],
    )).rows[0].wrapped_key;

    await rotated().findKeyFor('vendor-1');

    const after = (await pg.pool.query<{ wrapped_key: Buffer }>(
      'SELECT wrapped_key FROM data_keys WHERE subject_id = $1', ['vendor-1'],
    )).rows[0].wrapped_key;
    expect(after.equals(before)).toBe(true);
  });

  it('fails loudly naming the version when a row was wrapped under a retired key', async () => {
    await preRotation().getOrCreateKeyFor('vendor-1');

    await expect(retired().findKeyFor('vendor-1')).rejects.toThrow(/key_version 1/);
  });
});
