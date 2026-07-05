import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Client, type PoolClient } from 'pg';
import { DomainEvent, PostgresEventStore, PostgresNotifications } from '@market-monster/event-sourcing';
import { PostgresHarness, startPostgres } from './testcontainer';

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

describe('events NOTIFY trigger', () => {
  it('notifies the events channel when a row is appended', async () => {
    const listener: PoolClient = await pg.pool.connect();
    try {
      await listener.query('LISTEN events');
      const notified = nextNotification(listener);

      await append('Thing');

      expect((await notified).channel).toBe('events');
    } finally {
      listener.release();
    }
  });
});

describe('PostgresNotifications', () => {
  let notifications: PostgresNotifications;
  let pokes: number;
  let subscription: { unsubscribe(): void };

  beforeEach(async () => {
    pokes = 0;
    notifications = new PostgresNotifications(
      () => new Client({ connectionString: pg.connectionString }),
      50,
    );
    subscription = notifications.notifications().subscribe(() => {
      pokes++;
    });
    await notifications.start();
  });

  afterEach(async () => {
    subscription.unsubscribe();
    await notifications.stop();
  });

  it('pokes when an event is appended', async () => {
    await append('Thing');

    await waitUntil(() => pokes >= 1);
    expect(pokes).toBe(1);
  });

  it('re-establishes LISTEN after the connection is terminated', async () => {
    await terminateListener();
    await waitUntil(() => pokes >= 1); // the catch-up poke signals the reconnect landed
    const afterReconnect = pokes;

    await append('Thing');

    await waitUntil(() => pokes > afterReconnect);
    expect(pokes).toBeGreaterThan(afterReconnect);
  });

  it('emits exactly one poke per append after a reconnect (no listener stacking)', async () => {
    await terminateListener();
    await waitUntil(() => pokes >= 1); // reconnected
    const baseline = pokes;

    await append('Thing');
    await settle();

    expect(pokes - baseline).toBe(1);
  });

  it('emits a catch-up poke on reconnect without any append', async () => {
    expect(pokes).toBe(0); // the first connect does not poke

    await terminateListener();
    await waitUntil(() => pokes >= 1);

    expect(pokes).toBe(1); // solely from the reconnect
  });

  it('stops emitting after shutdown', async () => {
    await notifications.stop();

    await append('Thing');
    await settle();

    expect(pokes).toBe(0);
  });
});

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
const settle = (): Promise<void> => sleep(300);

async function waitUntil(predicate: () => boolean, timeoutMs = 10_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() > deadline) {
      throw new Error('waitUntil timed out');
    }
    await sleep(25);
  }
}

function terminateListener(): Promise<unknown> {
  return pg.pool.query(
    `SELECT pg_terminate_backend(pid) FROM pg_stat_activity
       WHERE datname = current_database() AND query = 'LISTEN events' AND pid <> pg_backend_pid()`,
  );
}

function append(type: string): Promise<void> {
  return new PostgresEventStore(pg.pool).append('stream-1', [dummyEvent(type)], 0);
}

function nextNotification(client: PoolClient): Promise<{ channel: string }> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('no notification within 2s')), 2000);
    client.once('notification', (message) => {
      clearTimeout(timer);
      resolve(message);
    });
  });
}

function dummyEvent(type: string): DomainEvent {
  return { type, payload: {}, version: 1 };
}
