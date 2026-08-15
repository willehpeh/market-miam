import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INestApplication, Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DiscoveryModule } from '@nestjs/core';
import request from 'supertest';
import { EMPTY } from 'rxjs';
import {
  CheckpointConflictError,
  CheckpointedProcessor,
  CheckpointedProjection,
  EventHandler,
  Events,
  Lineage,
  Processor,
  Projection,
  StoredEvent,
} from '@market-miam/event-sourcing';
import { registerSpanCapture } from '../testing/span-capture';
import { Subscriptions } from './subscriptions';
import { PollSchedule } from './poll-schedule';
import { HealthController } from './health.controller';

const exporter = registerSpanCapture();

const shipEvent: StoredEvent = {
  id: 'e1',
  type: 'Ship',
  payload: {},
  version: 1,
  streamId: 'stream',
  streamPosition: 1,
  globalPosition: 1,
  timestamp: 0,
};

const oneShipEvent: Events = {
  head: () => Promise.resolve(1),
  loadFrom: (position) => Promise.resolve(position < 1 ? [shipEvent] : []),
};

class Handler implements EventHandler {
  constructor(private readonly types: string[], public behave: () => Promise<void> = () => Promise.resolve()) {}

  eventTypes(): string[] {
    return this.types;
  }

  handle(): Promise<void> {
    return this.behave();
  }

  reset(): Promise<void> {
    return Promise.resolve();
  }
}

@CheckpointedProcessor('shipper')
class Shipper extends Handler implements Processor {
  constructor() {
    super(['Ship']);
  }
}

@CheckpointedProjection('viewer')
class Viewer extends Handler implements Projection {
  constructor() {
    super(['Ship']);
  }
}

// One window comfortably covers any capped backoff between consecutive failures.
const BACKOFF_CAP_MS = 30_000;

describe('Stuck-subscription health', () => {
  let app: INestApplication;

  beforeEach(() => {
    vi.useFakeTimers();
    exporter.reset();
  });

  afterEach(async () => {
    await app.close();
    vi.useRealTimers();
  });

  async function boot(): Promise<INestApplication> {
    const moduleRef = await Test.createTestingModule({
      imports: [DiscoveryModule],
      controllers: [HealthController],
      providers: [
        Subscriptions,
        Lineage,
        Shipper,
        Viewer,
        { provide: Events, useValue: oneShipEvent },
        { provide: PollSchedule, useValue: PollSchedule.pokedWithBackstop(EMPTY) },
        { provide: Logger, useValue: { log: () => undefined, error: () => undefined } },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    return app;
  }

  // The behaviour under test must be in place before the first poke fires — the stub is
  // swapped after boot, so nothing may poll until the test says so. Each window is wide
  // enough for one whole fail-and-retry cycle at any backoff depth.
  const failuresOf = async (expected: number) => {
    await vi.advanceTimersByTimeAsync(0);
    for (let i = 1; i < expected; i++) {
      await vi.advanceTimersByTimeAsync(BACKOFF_CAP_MS);
    }
  };

  it('reports ok while every subscription makes progress', async () => {
    await boot();
    await vi.advanceTimersByTimeAsync(0);

    const response = await request(app.getHttpServer()).get('/health').expect(200);

    expect(response.body).toEqual({
      status: 'ok',
      subscriptions: [
        { name: 'shipper', kind: 'processor', consecutiveFailures: 0 },
        { name: 'viewer', kind: 'projection', consecutiveFailures: 0 },
      ],
    });
  });

  // The page condition, matching the trigger the free tier cannot hold: a processor
  // failing more than five consecutive polls is stuck, and an external monitor polling
  // this route is what pages.
  it('goes unavailable once a processor is stuck', async () => {
    await boot();
    app.get(Shipper).behave = () => Promise.reject(new Error('side effect boom'));

    await failuresOf(6);

    const response = await request(app.getHttpServer()).get('/health').expect(503);
    expect(response.body.status).toBe('stuck');
    expect(response.body.subscriptions).toContainEqual(
      { name: 'shipper', kind: 'processor', consecutiveFailures: expect.any(Number) },
    );
  });

  // The warn half of the asymmetry: a lagging projection means stale reads, not lost
  // side effects — reported in the body, never paged on.
  it('stays ok while only a projection struggles', async () => {
    await boot();
    app.get(Viewer).behave = () => Promise.reject(new Error('view boom'));

    await failuresOf(6);

    const response = await request(app.getHttpServer()).get('/health').expect(200);
    const viewer = (response.body.subscriptions as { name: string; consecutiveFailures: number }[])
      .find(subscription => subscription.name === 'viewer');
    expect(viewer?.consecutiveFailures).toBeGreaterThan(5);
  });

  it('clears the count once a poll succeeds again', async () => {
    await boot();
    let failures = 0;
    app.get(Shipper).behave = () =>
      failures++ < 2 ? Promise.reject(new Error('transient')) : Promise.resolve();

    await failuresOf(6);

    const response = await request(app.getHttpServer()).get('/health').expect(200);
    expect(response.body.subscriptions).toContainEqual(
      { name: 'shipper', kind: 'processor', consecutiveFailures: 0 },
    );
  });

  // A checkpoint conflict is a concurrent writer, not a failure — a deploy overlap must
  // not page anyone.
  it('does not count yielding to a concurrent writer', async () => {
    await boot();
    app.get(Shipper).behave = () => Promise.reject(new CheckpointConflictError('shipper', 0));

    await failuresOf(6);

    const response = await request(app.getHttpServer()).get('/health').expect(200);
    expect(response.body.subscriptions).toContainEqual(
      { name: 'shipper', kind: 'processor', consecutiveFailures: 0 },
    );
  });

  // The durable record (O11Y-PLAN step 5): a zero-duration error span per failed poll,
  // from the only seam that knows recovery depth — trigger-ready if a slot ever frees.
  it('emits a wide error span per failed poll', async () => {
    await boot();
    app.get(Shipper).behave = () => Promise.reject(new Error('side effect boom'));

    await failuresOf(2);

    const spans = exporter.getFinishedSpans().filter(span => span.name === 'subscription poll failed');
    expect(spans.length).toBeGreaterThanOrEqual(1);
    const last = spans[spans.length - 1];
    expect(last.attributes).toMatchObject({
      'subscription.name': 'shipper',
      'subscription.kind': 'processor',
      'subscription.retry_count': expect.any(Number),
      'exception.slug': 'subscription-poll-failed',
    });
    expect(last.attributes['subscription.retry_count']).toBeGreaterThanOrEqual(1);
    expect(last.status.code).toBe(2);
    expect(last.events.some(event => event.name === 'exception')).toBe(true);
  });
});
