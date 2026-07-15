import { beforeEach, describe, expect, it } from 'vitest';
import type { Client } from 'pg';
import type { Logger } from '@nestjs/common';
import { ListenStatus, PostgresNotifications } from '@market-miam/event-sourcing';
import { TracingPostgresNotifications } from './postgres-notifications';
import { registerSpanCapture } from '../../testing/span-capture';

const exporter = registerSpanCapture();

class RecordingLogger {
  readonly logs: string[] = [];
  readonly errors: { message: unknown; error: unknown }[] = [];

  log(message: string): void {
    this.logs.push(message);
  }

  error(message: unknown, error?: unknown): void {
    this.errors.push({ message, error });
  }
}

// Boundary stub for pg's Client — the one true boundary the wrapper reaches through.
// Lets a test resolve/reject the connection and fire notification/error/end.
class FakeClient {
  private readonly handlers = new Map<string, ((arg?: unknown) => void)[]>();
  connectError?: unknown;
  ended = false;

  on(event: string, cb: (arg?: unknown) => void): this {
    const list = this.handlers.get(event) ?? [];
    list.push(cb);
    this.handlers.set(event, list);
    return this;
  }

  removeAllListeners(): this {
    this.handlers.clear();
    return this;
  }

  connect(): Promise<void> {
    return this.connectError ? Promise.reject(this.connectError) : Promise.resolve();
  }

  query(): Promise<{ rows: unknown[] }> {
    return Promise.resolve({ rows: [] });
  }

  end(): Promise<void> {
    this.ended = true;
    return Promise.resolve();
  }

  fire(event: string, arg?: unknown): void {
    (this.handlers.get(event) ?? []).forEach((cb) => cb(arg));
  }
}

describe('TracingPostgresNotifications', () => {
  let clients: FakeClient[];
  let inner: PostgresNotifications;
  let logger: RecordingLogger;
  let wrapper: TracingPostgresNotifications;

  beforeEach(() => {
    exporter.reset();
    clients = [];
    inner = new PostgresNotifications(() => {
      const client = new FakeClient();
      clients.push(client);
      return client as unknown as Client;
    }, 5);
    logger = new RecordingLogger();
    wrapper = new TracingPostgresNotifications(inner, logger as unknown as Logger);
  });

  it('marks and logs `connected` on bootstrap', async () => {
    await wrapper.onApplicationBootstrap();

    expect(spanFor('connected')?.attributes).toMatchObject({
      'listen.state': 'connected',
      'reconnect.attempt': 0,
    });
    expect(logger.logs).toContain('LISTEN connected');

    await wrapper.onApplicationShutdown();
  });

  it('emits a marker span per transition, carrying attempt and error message', async () => {
    await wrapper.onApplicationBootstrap();
    live().fire('error', new Error('conn boom'));
    await waitUntil(() => spanFor('reconnected') !== undefined);

    expect(spanFor('connected')?.attributes['reconnect.attempt']).toBe(0);
    expect(spanFor('dropped')?.attributes).toMatchObject({
      'listen.state': 'dropped',
      'error.message': 'conn boom',
    });
    expect(spanFor('reconnected')?.attributes['reconnect.attempt']).toBe(1);

    await wrapper.onApplicationShutdown();
  });

  it('logs connected/reconnected via log() and dropped via error()', async () => {
    await wrapper.onApplicationBootstrap();
    live().fire('error', new Error('drop boom'));
    await waitUntil(() => spanFor('reconnected') !== undefined);

    expect(logger.logs).toEqual(expect.arrayContaining(['LISTEN connected', 'LISTEN reconnected']));
    expect(logger.errors).toContainEqual({ message: 'LISTEN dropped', error: expect.any(Error) });

    await wrapper.onApplicationShutdown();
  });

  it('delegates notifications() so pokes pass through', async () => {
    await wrapper.onApplicationBootstrap();
    const pokes: number[] = [];
    wrapper.notifications().subscribe(() => pokes.push(1));

    live().fire('notification', { channel: 'events' });

    expect(pokes).toHaveLength(1);

    await wrapper.onApplicationShutdown();
  });

  it('replays the current status to a subscriber that attaches after start (ReplaySubject)', async () => {
    await inner.start(); // `connected` emitted before anyone subscribes
    const seen: ListenStatus[] = [];
    inner.status().subscribe((status) => seen.push(status));

    expect(seen.map((status) => status.state)).toEqual(['connected']);

    await inner.stop();
  });

  it('stops the inner and marks nothing after shutdown', async () => {
    await wrapper.onApplicationBootstrap();
    const client = live();

    await wrapper.onApplicationShutdown();
    exporter.reset();
    logger.logs.length = 0;
    client.fire('error', new Error('after shutdown'));
    await settle();

    expect(client.ended).toBe(true);
    expect(pgSpans()).toHaveLength(0);
    expect(logger.logs).toHaveLength(0);
  });

  function live(): FakeClient {
    return clients[clients.length - 1];
  }

  function pgSpans() {
    return exporter.getFinishedSpans().filter((span) => span.name.startsWith('pg-listen'));
  }

  function spanFor(state: string) {
    return pgSpans().find((span) => span.attributes['listen.state'] === state);
  }
});

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
const settle = (): Promise<void> => sleep(100);

async function waitUntil(predicate: () => boolean, timeoutMs = 2000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() > deadline) {
      throw new Error('waitUntil timed out');
    }
    await sleep(10);
  }
}
