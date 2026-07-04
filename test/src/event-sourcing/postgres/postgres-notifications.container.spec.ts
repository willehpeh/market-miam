import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { PoolClient } from 'pg';
import { DomainEvent, PostgresEventStore } from '@market-monster/event-sourcing';
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

      await new PostgresEventStore(pg.pool).append('stream-1', [dummyEvent('Thing')], 0);

      expect((await notified).channel).toBe('events');
    } finally {
      listener.release();
    }
  });
});

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
