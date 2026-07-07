import { Inject, Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown, Optional } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import { EMPTY, exhaustMap, from, mergeMap, Observable, retry, Subject, takeUntil, timer } from 'rxjs';
import {
  Checkpoint,
  checkpointMetadata,
  EventHandler,
  Events,
  InMemoryCheckpoint,
  MessageContext,
  PollingSubscription,
  Subscription
} from '@market-miam/event-sourcing';
import { TracingEventHandler } from './tracing.event-handler';
import { ContinuationContextHandler } from '../message-context/continuation-context.handler';
import { pollSchedule } from './poll-schedule';

export const POLLING_ENABLED = Symbol('POLLING_ENABLED');

// ponytail: a stream of pokes that ask Subscriptions to poll now. Default is EMPTY —
// pollSchedule's timer is the whole drive today. Provide a real source (Postgres
// LISTEN) to cut latency and idle poll load; Subscriptions is otherwise unchanged
// and pollSchedule's interval becomes a safety net you can lengthen.
export const EVENT_NOTIFICATIONS = Symbol('EVENT_NOTIFICATIONS');

// The durability seam. Default builds in-memory checkpoints; provide a factory that
// returns PostgresCheckpoint to make checkpoints survive restart. The runner depends
// only on this factory, never on a Pool.
export const CHECKPOINT_FACTORY = Symbol('CHECKPOINT_FACTORY');
export type CheckpointFactory = (name: string) => Checkpoint;

const RETRY_BACKOFF_MS = 1000;
const MAX_RETRY_BACKOFF_MS = 30_000;

@Injectable()
export class Subscriptions implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly stopped = new Subject<void>();
  private subscriptions: Subscription[] = [];

  constructor(
    private readonly discovery: DiscoveryService,
    private readonly events: Events,
    private readonly context: MessageContext,
    @Inject(POLLING_ENABLED) private readonly pollingEnabled: boolean,
    @Optional() @Inject(EVENT_NOTIFICATIONS) private readonly notifications: Observable<void> = EMPTY,
    @Optional() @Inject(CHECKPOINT_FACTORY) private readonly checkpointFor: CheckpointFactory = (name) => new InMemoryCheckpoint(name),
    @Optional() private readonly logger: Logger = new Logger(Subscriptions.name),
  ) {}

  onApplicationBootstrap(): void {
    this.subscriptions = this.buildSubscriptions();
    if (this.pollingEnabled) {
      this.startPolling();
    }
  }

  onApplicationShutdown(): void {
    this.stopped.next();
    this.stopped.complete();
  }

  async drain(): Promise<void> {
    // ponytail: N rounds where N = subscription count, so a processor's events
    // reach downstream projections within one drain. The bound is a proxy for
    // max cascade depth (today: 1). If cascades ever chain deeper than the
    // subscription count, loop until a round produces no new events instead.
    for (let i = 0; i < this.subscriptions.length; i++) {
      await Promise.all(this.subscriptions.map((subscription) => subscription.poll()));
    }
  }

  private buildSubscriptions(): Subscription[] {
    const checkpoints = new Set<string>();
    return this.handlers().map(({ handler, name, kind }) => {
      if (checkpoints.has(name)) {
        throw new Error(`Duplicate checkpoint '${name}'`);
      }
      checkpoints.add(name);
      const driven =
        kind === 'processor' ? new ContinuationContextHandler(handler, this.context) : handler;
      return new PollingSubscription(
        this.events,
        new TracingEventHandler(driven),
        this.checkpointFor(name),
      );
    });
  }

  private handlers(): { handler: EventHandler; name: string; kind: string }[] {
    return this.discovery
      .getProviders()
      .map((wrapper) => wrapper.instance)
      .filter((instance): instance is EventHandler => isCheckpointed(instance))
      .map((handler) => {
        const metadata = checkpointMetadata(handler.constructor);
        return { handler, name: metadata?.name as string, kind: metadata?.kind as string };
      });
  }

  private startPolling(): void {
    from(this.subscriptions)
      .pipe(
        mergeMap(this.wakeSubscription()),
        takeUntil(this.stopped),
      )
      .subscribe();
  }

  private wakeSubscription() {
    return (subscription: Subscription) => pollSchedule(this.notifications).pipe(
      exhaustMap(() => subscription.poll()),
      // ponytail: exponential backoff, capped, reset once a poll succeeds. Infinite
      // retries are deliberate — a transient store outage should recover, not kill
      // the consumer. A poison event (handler throws on the same event every time)
      // still replays forever; skipping it needs per-event dead-lettering inside
      // poll(), which is a durable-store concern — deferred until Postgres.
      retry({
        resetOnSuccess: true,
        delay: (error, retryCount) => {
          this.logger.error('Subscription poll failed', error);
          return timer(Math.min(RETRY_BACKOFF_MS * 2 ** (retryCount - 1), MAX_RETRY_BACKOFF_MS));
        },
      }),
    );
  }
}

function isCheckpointed(instance: unknown): instance is EventHandler {
  return (
    typeof instance === 'object' &&
    instance !== null &&
    checkpointMetadata(instance.constructor) !== undefined
  );
}
