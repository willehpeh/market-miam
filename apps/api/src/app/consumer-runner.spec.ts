import { afterEach, describe, expect, it, vi } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DiscoveryModule } from '@nestjs/core';
import {
  CheckpointedProjection,
  EventHandler,
  Events,
  StoredEvent,
} from '@market-monster/event-sourcing';
import { ConsumerRunner, POLLING_ENABLED } from './consumer-runner';

class NoopProjection implements EventHandler {
  eventTypes(): string[] {
    return [];
  }

  handle(): Promise<void> {
    return Promise.resolve();
  }
}

@CheckpointedProjection('storefront')
class StorefrontProjection extends NoopProjection {}

@CheckpointedProjection('storefront')
class CollidingProjection extends NoopProjection {}

const noEvents: Events = { loadFrom: () => Promise.resolve([] as StoredEvent[]) };

describe('ConsumerRunner', () => {
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
        ConsumerRunner,
        StorefrontProjection,
        CollidingProjection,
        { provide: Events, useValue: noEvents },
        { provide: POLLING_ENABLED, useValue: false },
      ],
    }).compile();

    await expect(moduleRef.createNestApplication().init()).rejects.toThrow(
      "Duplicate projection checkpoint 'storefront'",
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
        ConsumerRunner,
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

    await vi.advanceTimersByTimeAsync(5000);
    expect(polls).toBeGreaterThan(afterStart);
  });
});
