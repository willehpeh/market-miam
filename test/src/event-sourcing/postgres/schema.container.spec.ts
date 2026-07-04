import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PostgresHarness, startPostgres } from './testcontainer';

describe('Postgres schema migration', () => {
  let pg: PostgresHarness;

  beforeAll(async () => {
    pg = await startPostgres();
  });

  afterAll(async () => {
    await pg?.stop();
  });

  it('creates the events and checkpoints tables', async () => {
    const { rows } = await pg.pool.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name IN ('events', 'checkpoints')
       ORDER BY table_name`,
    );

    expect(rows.map((r) => r.table_name)).toEqual(['checkpoints', 'events']);
  });

  it('rejects UPDATE and DELETE on events (append-only)', async () => {
    await pg.reset();
    await pg.pool.query(
      `INSERT INTO events (id, stream_id, stream_position, event_type, payload, version, created_at)
       VALUES (gen_random_uuid(), 'stream-1', 1, 'Thing', '{}'::jsonb, 1, 0)`,
    );

    await expect(pg.pool.query(`UPDATE events SET event_type = 'X'`)).rejects.toThrow(/append-only/);
    await expect(pg.pool.query(`DELETE FROM events`)).rejects.toThrow(/append-only/);
  });
});
