import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';
import type { Client } from 'pg';
import { ListenStatus, PostgresNotifications } from '@market-miam/event-sourcing';

// The connection lifecycle needs no database: the Client factory is injected, so
// a stub EventEmitter pins boot rejection, reconnect policy, attempt numbering,
// and stop semantics in the fast suite. Real-socket behaviour (re-LISTEN, poke
// delivery, pg_terminate_backend) stays in the container spec.
class StubClient extends EventEmitter {
  connect = vi.fn(async () => undefined);
  query = vi.fn(async () => undefined);
  end = vi.fn(async () => undefined);
}

function harness(clients: StubClient[]) {
  let created = 0;
  const notifications = new PostgresNotifications(() => {
    if (created >= clients.length) {
      throw new Error('factory exhausted');
    }
    return clients[created++] as unknown as Client;
  }, 1);
  return { notifications, createdClients: () => created };
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

async function waitUntil(predicate: () => boolean, timeoutMs = 2000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() > deadline) {
      throw new Error('waitUntil timed out');
    }
    await sleep(2);
  }
}

describe('PostgresNotifications lifecycle', () => {
  it('start() rejects when the first connection cannot be established, scheduling no reconnect', async () => {
    const failing = new StubClient();
    failing.connect.mockRejectedValue(new Error('connection refused'));
    const { notifications, createdClients } = harness([failing, new StubClient()]);

    await expect(notifications.start()).rejects.toThrow('connection refused');

    await sleep(30);
    expect(createdClients()).toBe(1); // no second client: boot failure is the caller's
  });

  it('start() rejects when LISTEN fails and closes the client', async () => {
    const failing = new StubClient();
    failing.query.mockRejectedValue(new Error('permission denied'));
    const { notifications } = harness([failing]);

    await expect(notifications.start()).rejects.toThrow('permission denied');
    expect(failing.end).toHaveBeenCalled();
  });

  it('is single-use: a second start() throws', async () => {
    const { notifications } = harness([new StubClient()]);
    await notifications.start();

    await expect(notifications.start()).rejects.toThrow(/single-use/);

    await notifications.stop();
  });

  it('forwards NOTIFY as pokes', async () => {
    const client = new StubClient();
    const { notifications } = harness([client]);
    let pokes = 0;
    notifications.notifications().subscribe(() => pokes++);
    await notifications.start();

    client.emit('notification');
    client.emit('notification');

    expect(pokes).toBe(2);
    await notifications.stop();
  });

  it('listens on the events channel', async () => {
    const client = new StubClient();
    const { notifications } = harness([client]);
    await notifications.start();

    expect(client.query).toHaveBeenCalledWith('LISTEN events');

    await notifications.stop();
  });

  it('reconnects after a loss: dropped then reconnected at attempt 1, plus the catch-up poke', async () => {
    const [first, second] = [new StubClient(), new StubClient()];
    const { notifications } = harness([first, second]);
    const statuses: ListenStatus[] = [];
    let pokes = 0;
    notifications.status().subscribe((status) => statuses.push(status));
    notifications.notifications().subscribe(() => pokes++);
    await notifications.start();

    first.emit('error', new Error('socket hang up'));
    await waitUntil(() => statuses.some((s) => s.state === 'reconnected'));

    expect(statuses.map((s) => s.state)).toEqual(['connected', 'dropped', 'reconnected']);
    expect(statuses.find((s) => s.state === 'reconnected')?.attempt).toBe(1);
    expect(pokes).toBe(1); // solely the catch-up poke
    await notifications.stop();
  });

  it('keeps retrying with increasing attempt numbers while reconnects fail', async () => {
    const stillDown = new StubClient();
    stillDown.connect.mockRejectedValue(new Error('still down'));
    const [first, third] = [new StubClient(), new StubClient()];
    const { notifications } = harness([first, stillDown, third]);
    const statuses: ListenStatus[] = [];
    notifications.status().subscribe((status) => statuses.push(status));
    await notifications.start();

    first.emit('end');
    await waitUntil(() => statuses.some((s) => s.state === 'reconnected'));

    const drops = statuses.filter((s) => s.state === 'dropped');
    expect(drops.map((s) => s.attempt)).toEqual([1, 2]);
    // Each drop carries its actual cause: the original loss, then the failed retry.
    expect(String(drops[0].error)).toMatch(/connection ended/);
    expect(String(drops[1].error)).toMatch(/still down/);
    expect(statuses.find((s) => s.state === 'reconnected')?.attempt).toBe(2);
    await notifications.stop();
  });

  it('doubles the backoff between failed reconnect attempts', async () => {
    vi.useFakeTimers();
    try {
      const first = new StubClient();
      const failing1 = new StubClient();
      failing1.connect.mockRejectedValue(new Error('still down'));
      const failing2 = new StubClient();
      failing2.connect.mockRejectedValue(new Error('still down'));
      const clients = [first, failing1, failing2, new StubClient()];
      let created = 0;
      const notifications = new PostgresNotifications(() => clients[created++] as unknown as Client, 100);
      await notifications.start();

      first.emit('error', new Error('socket hang up'));
      await vi.advanceTimersByTimeAsync(99);
      expect(created).toBe(1); // first backoff is the full initial interval
      await vi.advanceTimersByTimeAsync(1);
      expect(created).toBe(2); // attempt 1 at t=100, fails
      await vi.advanceTimersByTimeAsync(199);
      expect(created).toBe(2); // second backoff doubled to 200
      await vi.advanceTimersByTimeAsync(1);
      expect(created).toBe(3); // attempt 2 at t=300, fails
      await vi.advanceTimersByTimeAsync(399);
      expect(created).toBe(3); // third backoff doubled to 400
      await vi.advanceTimersByTimeAsync(1);
      expect(created).toBe(4); // attempt 3 succeeds

      await notifications.stop();
    } finally {
      vi.useRealTimers();
    }
  });

  it('a connection that finishes opening after stop() is closed, not adopted', async () => {
    const first = new StubClient();
    const second = new StubClient();
    let release!: () => void;
    second.connect = vi.fn(() => new Promise<undefined>((resolve) => (release = () => resolve(undefined))));
    const { notifications } = harness([first, second]);
    const statuses: ListenStatus[] = [];
    notifications.status().subscribe((status) => statuses.push(status));
    await notifications.start();

    first.emit('error', new Error('socket hang up'));
    await waitUntil(() => second.connect.mock.calls.length === 1); // reopen in flight
    const stopping = notifications.stop();
    release();
    await stopping;
    await sleep(10);

    expect(second.end).toHaveBeenCalled();
    expect(statuses.map((s) => s.state)).not.toContain('reconnected');
  });

  it('a loss firing both error and end triggers a single recovery', async () => {
    const [first, second] = [new StubClient(), new StubClient()];
    const { notifications, createdClients } = harness([first, second]);
    const statuses: ListenStatus[] = [];
    notifications.status().subscribe((status) => statuses.push(status));
    await notifications.start();

    first.emit('error', new Error('socket hang up'));
    first.emit('end');
    await waitUntil(() => statuses.some((s) => s.state === 'reconnected'));
    await sleep(30);

    expect(statuses.filter((s) => s.state === 'dropped')).toHaveLength(1);
    expect(createdClients()).toBe(2);
    await notifications.stop();
  });

  it('stop() completes both streams and ends the client', async () => {
    const client = new StubClient();
    const { notifications } = harness([client]);
    let pokesCompleted = false;
    let statusesCompleted = false;
    notifications.notifications().subscribe({ complete: () => (pokesCompleted = true) });
    notifications.status().subscribe({ complete: () => (statusesCompleted = true) });
    await notifications.start();

    await notifications.stop();

    expect(pokesCompleted).toBe(true);
    expect(statusesCompleted).toBe(true);
    expect(client.end).toHaveBeenCalled();
  });

  it('stop() is idempotent', async () => {
    const { notifications } = harness([new StubClient()]);
    await notifications.start();

    await notifications.stop();
    await expect(notifications.stop()).resolves.toBeUndefined();
  });

  it('stop() during backoff halts recovery and leaves no pending timers', async () => {
    vi.useFakeTimers();
    try {
      const first = new StubClient();
      const clients = [first, new StubClient()];
      let created = 0;
      const notifications = new PostgresNotifications(() => clients[created++] as unknown as Client, 10_000);
      await notifications.start();

      first.emit('error', new Error('socket hang up'));
      await vi.advanceTimersByTimeAsync(0); // dropped published, backoff timer armed
      await notifications.stop();

      expect(vi.getTimerCount()).toBe(0); // the backoff timer was cancelled, not abandoned
      await vi.advanceTimersByTimeAsync(60_000);
      expect(created).toBe(1); // no reconnect attempt after stop
    } finally {
      vi.useRealTimers();
    }
  });
});
