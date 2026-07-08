import { afterEach, describe, expect, it, vi } from 'vitest';
import { INestApplication, Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DiscoveryModule } from '@nestjs/core';
import { Subject } from 'rxjs';
import {
  CheckpointedProcessor,
  CheckpointedProjection,
  EventHandler,
  Events,
  InMemoryCheckpoint,
  MessageContext,
  Processor,
  Projection,
  StoredEvent,
} from '@market-miam/event-sourcing';
import {
  Subscriptions,
  CHECKPOINT_FACTORY,
  EVENT_NOTIFICATIONS,
  POLLING_ENABLED,
} from './subscriptions';

class NoopHandler implements EventHandler {
  eventTypes(): string[] {
    return [];
  }

  handle(): Promise<void> {
    return Promise.resolve();
  }

  reset(): Promise<void> {
    return Promise.resolve();
  }
}

@CheckpointedProjection('storefront')
class StorefrontProjection extends NoopHandler implements Projection {}

@CheckpointedProjection('storefront')
class CollidingProjection extends NoopHandler implements Projection {}

class RecordingHandler implements EventHandler {
  readonly handled: StoredEvent[] = [];

  eventTypes(): string[] {
    return ['Thing'];
  }

  handle(event: StoredEvent): Promise<void> {
    this.handled.push(event);
    return Promise.resolve();
  }

  reset(): Promise<void> {
    this.handled.length = 0;
    return Promise.resolve();
  }
}

@CheckpointedProjection('recorder')
class Recorder extends RecordingHandler implements Projection {}

class SideEffect implements EventHandler {
  runs = 0;

  eventTypes(): string[] {
    return ['Thing'];
  }

  handle(): Promise<void> {
    this.runs++;
    return Promise.resolve();
  }
}

@CheckpointedProcessor('side-effect')
class SideEffectProcessor extends SideEffect implements Processor {}

class RecordingLogger {
  readonly errors: { message: unknown; params: unknown[] }[] = [];

  error(message: unknown, ...params: unknown[]): void {
    this.errors.push({ message, params });
  }
}

const noEvents: Events = { loadFrom: () => Promise.resolve([] as StoredEvent[]) };

describe('Subscriptions', () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
    vi.useRealTimers();
  });

  it('fails fast when two projections share a checkpoint name', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [DiscoveryModule],
      providers: [
        Subscriptions,
        MessageContext,
        StorefrontProjection,
        CollidingProjection,
        { provide: Events, useValue: noEvents },
        { provide: POLLING_ENABLED, useValue: false },
      ],
    }).compile();

    await expect(moduleRef.createNestApplication().init()).rejects.toThrow(
      "Duplicate checkpoint 'storefront'",
    );
  });

  it('polls a discovered subscription repeatedly while running', async () => {
    vi.useFakeTimers();
    let polls = 0;
    const countingEvents: Events = {
      loadFrom: () => {
        polls++;
        return Promise.resolve([] as StoredEvent[]);
      },
    };

    const moduleRef = await Test.createTestingModule({
      imports: [DiscoveryModule],
      providers: [
        Subscriptions,
        MessageContext,
        StorefrontProjection,
        { provide: Events, useValue: countingEvents },
        { provide: POLLING_ENABLED, useValue: true },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    await vi.advanceTimersByTimeAsync(0);
    const afterStart = polls;
    expect(afterStart).toBeGreaterThan(0);

    await vi.advanceTimersByTimeAsync(30000);
    expect(polls).toBeGreaterThan(afterStart);
  });

  it('polls when notified, without waiting for the interval', async () => {
    vi.useFakeTimers();
    let polls = 0;
    const countingEvents: Events = {
      loadFrom: () => {
        polls++;
        return Promise.resolve([] as StoredEvent[]);
      },
    };
    const notifications = new Subject<void>();

    const moduleRef = await Test.createTestingModule({
      imports: [DiscoveryModule],
      providers: [
        Subscriptions,
        MessageContext,
        StorefrontProjection,
        { provide: Events, useValue: countingEvents },
        { provide: POLLING_ENABLED, useValue: true },
        { provide: EVENT_NOTIFICATIONS, useValue: notifications },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    await vi.advanceTimersByTimeAsync(0);
    const afterStart = polls;

    notifications.next();
    await vi.advanceTimersByTimeAsync(0);

    expect(polls).toBeGreaterThan(afterStart);
  });

  it('backs off exponentially between failed polls', async () => {
    vi.useFakeTimers();
    let polls = 0;
    const alwaysFails: Events = {
      loadFrom: () => {
        polls++;
        return Promise.reject(new Error('boom'));
      },
    };

    const moduleRef = await Test.createTestingModule({
      imports: [DiscoveryModule],
      providers: [
        Subscriptions,
        MessageContext,
        StorefrontProjection,
        { provide: Events, useValue: alwaysFails },
        { provide: POLLING_ENABLED, useValue: true },
        { provide: Logger, useValue: new RecordingLogger() },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    await vi.advanceTimersByTimeAsync(0);
    expect(polls).toBe(1);

    await vi.advanceTimersByTimeAsync(1500);
    expect(polls).toBe(2);

    // second backoff is 2000ms, so no third attempt yet — a fixed 1s backoff
    // would have polled again at t=2000.
    await vi.advanceTimersByTimeAsync(1000);
    expect(polls).toBe(2);

    await vi.advanceTimersByTimeAsync(1000);
    expect(polls).toBe(3);
  });

  it('logs the failure and keeps polling when a subscription poll throws', async () => {
    vi.useFakeTimers();
    const logger = new RecordingLogger();
    let polls = 0;
    const flakyEvents: Events = {
      loadFrom: () => {
        polls++;
        return polls === 1
          ? Promise.reject(new Error('poll boom'))
          : Promise.resolve([] as StoredEvent[]);
      },
    };

    const moduleRef = await Test.createTestingModule({
      imports: [DiscoveryModule],
      providers: [
        Subscriptions,
        MessageContext,
        StorefrontProjection,
        { provide: Events, useValue: flakyEvents },
        { provide: POLLING_ENABLED, useValue: true },
        { provide: Logger, useValue: logger },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(2000);

    expect(polls).toBeGreaterThan(1);
    expect(logger.errors).toContainEqual({
      message: 'Subscription poll failed',
      params: [expect.any(Error)],
    });
  });

  it('drains the whole backlog in a single poll, not just one batch', async () => {
    const all: StoredEvent[] = Array.from({ length: 250 }, (_, i) => ({
      id: `e${i + 1}`,
      type: 'Thing',
      payload: {},
      version: 1,
      streamId: 'stream',
      streamPosition: i + 1,
      globalPosition: i + 1,
      timestamp: 0,
    }));
    const backlog: Events = {
      loadFrom: (position, limit) =>
        Promise.resolve(all.filter((event) => event.globalPosition > position).slice(0, limit)),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [DiscoveryModule],
      providers: [
        Subscriptions,
        MessageContext,
        Recorder,
        { provide: Events, useValue: backlog },
        { provide: POLLING_ENABLED, useValue: false },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    await app.get(Subscriptions).drain();

    expect(app.get(Recorder).handled).toHaveLength(250);
  });

  it('rebuilds a projection: clears its read model and replays from zero', async () => {
    const events: StoredEvent[] = Array.from({ length: 3 }, (_, i) => ({
      id: `e${i + 1}`,
      type: 'Thing',
      payload: {},
      version: 1,
      streamId: 'stream',
      streamPosition: i + 1,
      globalPosition: i + 1,
      timestamp: 0,
    }));
    const backlog: Events = {
      loadFrom: (position, limit) =>
        Promise.resolve(events.filter((event) => event.globalPosition > position).slice(0, limit)),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [DiscoveryModule],
      providers: [
        Subscriptions,
        MessageContext,
        Recorder,
        { provide: Events, useValue: backlog },
        { provide: POLLING_ENABLED, useValue: false },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    const subscriptions = app.get(Subscriptions);
    await subscriptions.drain();

    const recorder = app.get(Recorder);
    recorder.handle({ ...events[0], id: 'stale' });
    expect(recorder.handled).toHaveLength(4);

    await subscriptions.rebuild('recorder');

    expect(recorder.handled.map((event) => event.id)).toEqual(['e1', 'e2', 'e3']);
  });

  it('refuses to replay a processor — re-running commands would duplicate side effects', async () => {
    const events: StoredEvent[] = [
      {
        id: 'e1',
        type: 'Thing',
        payload: {},
        version: 1,
        streamId: 'stream',
        streamPosition: 1,
        globalPosition: 1,
        timestamp: 0,
      },
    ];
    const backlog: Events = {
      loadFrom: (position, limit) =>
        Promise.resolve(events.filter((event) => event.globalPosition > position).slice(0, limit)),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [DiscoveryModule],
      providers: [
        Subscriptions,
        MessageContext,
        SideEffectProcessor,
        { provide: Events, useValue: backlog },
        { provide: POLLING_ENABLED, useValue: false },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    const subscriptions = app.get(Subscriptions);
    await subscriptions.drain();
    expect(app.get(SideEffectProcessor).runs).toBe(1);

    await expect(subscriptions.rebuild('side-effect')).rejects.toThrow(/processor/);
    expect(app.get(SideEffectProcessor).runs).toBe(1);
  });

  it('rejects a rebuild of an unknown subscription', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [DiscoveryModule],
      providers: [
        Subscriptions,
        MessageContext,
        Recorder,
        { provide: Events, useValue: noEvents },
        { provide: POLLING_ENABLED, useValue: false },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    await expect(app.get(Subscriptions).rebuild('nope')).rejects.toThrow("No subscription 'nope'");
  });

  it('builds every checkpoint through CHECKPOINT_FACTORY', async () => {
    const names: string[] = [];
    const moduleRef = await Test.createTestingModule({
      imports: [DiscoveryModule],
      providers: [
        Subscriptions,
        MessageContext,
        StorefrontProjection,
        Recorder,
        { provide: Events, useValue: noEvents },
        { provide: POLLING_ENABLED, useValue: false },
        {
          provide: CHECKPOINT_FACTORY,
          useValue: (name: string) => {
            names.push(name);
            return new InMemoryCheckpoint(name);
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    expect([...names].sort()).toEqual(['recorder', 'storefront']);
  });
});
