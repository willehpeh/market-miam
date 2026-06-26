import { afterEach, describe, expect, it, vi } from 'vitest';
import { INestApplication, Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DiscoveryModule } from '@nestjs/core';
import {
  CheckpointedProjection,
  EventHandler,
  Events,
  MessageContext,
  StoredEvent,
} from '@market-monster/event-sourcing';
import { ConsumerRunner, POLLING_ENABLED } from './consumer-runner';

class NoopHandler implements EventHandler {
  eventTypes(): string[] {
    return [];
  }

  handle(): Promise<void> {
    return Promise.resolve();
  }
}

@CheckpointedProjection('storefront')
class StorefrontProjection extends NoopHandler {}

@CheckpointedProjection('storefront')
class CollidingProjection extends NoopHandler {}

// A boundary fake for the injected logger: records errors instead of writing
// them, so failures can be asserted without reaching for a mocking framework.
// Exposes only error — the one behaviour ConsumerRunner uses.
class RecordingLogger {
  readonly errors: { message: unknown; params: unknown[] }[] = [];

  error(message: unknown, ...params: unknown[]): void {
    this.errors.push({ message, params });
  }
}

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
        ConsumerRunner,
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

    await vi.advanceTimersByTimeAsync(5000);
    expect(polls).toBeGreaterThan(afterStart);
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
        ConsumerRunner,
        MessageContext,
        StorefrontProjection,
        { provide: Events, useValue: flakyEvents },
        { provide: POLLING_ENABLED, useValue: true },
        { provide: Logger, useValue: logger },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    await vi.advanceTimersByTimeAsync(0); // first poll rejects
    await vi.advanceTimersByTimeAsync(1000); // retry delay elapses, polling resumes

    expect(polls).toBeGreaterThan(1);
    expect(logger.errors).toContainEqual({
      message: 'Subscription poll failed',
      params: [expect.any(Error)],
    });
  });
});
