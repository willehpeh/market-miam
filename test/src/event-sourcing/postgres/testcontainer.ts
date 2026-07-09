import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import { runner } from 'node-pg-migrate';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';

const MIGRATIONS_DIR = fileURLToPath(new URL('../../../../database/migrations', import.meta.url));

export interface PostgresHarness {
  pool: Pool;
  connectionString: string;
  reset(): Promise<void>;
  stop(): Promise<void>;
}

// Starts a throwaway Postgres, applies the real production migrations, and hands
// back a pool. The same container is shared across a spec; `reset()` truncates
// between tests (TRUNCATE bypasses the append-only trigger by design).
export async function startPostgres(): Promise<PostgresHarness> {
  const container: StartedPostgreSqlContainer = await new PostgreSqlContainer('postgres:16').start();
  const databaseUrl = container.getConnectionUri();

  await runner({
    databaseUrl,
    dir: MIGRATIONS_DIR,
    direction: 'up',
    count: Infinity,
    migrationsTable: 'pgmigrations',
  });

  const pool = new Pool({ connectionString: databaseUrl });

  return {
    pool,
    connectionString: databaseUrl,
    reset: async () => {
      await pool.query('TRUNCATE events, checkpoints, data_keys, vendor_storefront_views, catalogue_view_items RESTART IDENTITY');
    },
    stop: async () => {
      await pool.end();
      await container.stop();
    },
  };
}
