import { Inject, Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown, Optional } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import { EMPTY, exhaustMap, from, mergeMap, Observable, retry, Subject, takeUntil, timer } from 'rxjs';
import {
  Checkpoint,
  CheckpointConflictError,
  CheckpointKind,
  checkpointMetadata,
  EventHandler,
  Events,
  InMemoryCheckpoint,
  Lineage,
  PollingSubscription,
  Projection,
  Subscription,
  UnitOfWork
} from '@market-miam/event-sourcing';
import { ContinuedLineageHandler } from '../lineage/continued-lineage.handler';
import { pollSchedule } from './poll-schedule';

export const POLLING_ENABLED = Symbol('POLLING_ENABLED');

// Poll interval override (ms). Unprovided → pollSchedule's default. Dev shortens it
// so the timer backstop is tight when there's no LISTEN/NOTIFY to poke the poller.
export const POLL_INTERVAL = Symbol('POLL_INTERVAL');

// A stream of pokes that ask Subscriptions to poll now. Default is EMPTY, but both
// real profiles provide a source — Postgres LISTEN, in-memory pokes on append — and in
// production this, not the timer, is what carries every append: a week of handler spans
// showed 4-275ms from commit to handler, with no interval-length tail.
export const EVENT_NOTIFICATIONS = Symbol('EVENT_NOTIFICATIONS');

// The durability seam. Default builds in-memory checkpoints; provide a factory that
// returns PostgresCheckpoint to make checkpoints survive restart. The runner depends
// only on this factory, never on a Pool.
export const CHECKPOINT_FACTORY = Symbol('CHECKPOINT_FACTORY');
export type CheckpointFactory = (name: string) => Checkpoint;

const RETRY_BACKOFF_MS = 1000;
const MAX_RETRY_BACKOFF_MS = 30_000;

interface ConsumerShape {
  readonly name: string;
  readonly checkpoint: Checkpoint;
  readonly subscription: Subscription;
}

// The kind discriminates what rebuild may do: only a projection carries reset().
// Narrowed once, in buildConsumers, where the decorator metadata is read — the
// runtime guarantee that a @CheckpointedProjection class implements Projection
// is the lint rule in eslint.config.mjs, not the type system.
type CheckpointedConsumer =
  | (ConsumerShape & { readonly kind: 'projection'; readonly handler: Projection })
  | (ConsumerShape & { readonly kind: 'processor'; readonly handler: EventHandler });

@Injectable()
export class Subscriptions implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly stopped = new Subject<void>();
  private consumers: CheckpointedConsumer[] = [];

  constructor(
    private readonly discovery: DiscoveryService,
    private readonly events: Events,
    private readonly lineage: Lineage,
    @Inject(POLLING_ENABLED) private readonly pollingEnabled: boolean,
    @Optional() @Inject(POLL_INTERVAL) private readonly pollIntervalMs?: number,
    @Optional() @Inject(EVENT_NOTIFICATIONS) private readonly notifications: Observable<void> = EMPTY,
    @Optional() @Inject(CHECKPOINT_FACTORY) private readonly checkpointFor: CheckpointFactory = (name) => new InMemoryCheckpoint(name),
    @Optional() @Inject(UnitOfWork) private readonly unitOfWork: UnitOfWork = UnitOfWork.none(),
    @Optional() private readonly logger: Logger = new Logger(Subscriptions.name),
  ) {}

  onApplicationBootstrap(): void {
    this.consumers = this.buildConsumers();
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
    for (let i = 0; i < this.consumers.length; i++) {
      await Promise.all(this.consumers.map((consumer) => poll(consumer.subscription)));
    }
  }

  // Rebuild a projection from zero: clear its read model and reset its checkpoint
  // atomically, then replay. Refused for processors — replaying a processor
  // re-dispatches its commands, re-running side effects (not replay-safe).
  // Leaves the background poller running deliberately: the reset fences out any
  // poll in flight — its next checkpoint advance expects a pre-reset position,
  // conflicts, and rolls its whole per-event transaction back (ADR 0036) — so a
  // stale batch can neither land effects nor move the checkpoint past unreplayed
  // events. Concurrent polls after the reset just contend per event via the same
  // CAS; each event's effects commit exactly once.
  async rebuild(name: string): Promise<void> {
    const consumer = this.consumers.find((candidate) => candidate.name === name);
    if (!consumer) {
      throw new Error(`No subscription '${name}' to rebuild`);
    }
    if (consumer.kind !== 'projection') {
      throw new Error(`Refusing to replay '${name}': a ${consumer.kind} re-runs its side effects`);
    }
    await this.unitOfWork.transaction(async () => {
      await consumer.handler.reset();
      await consumer.checkpoint.reset();
    });
    await poll(consumer.subscription);
  }

  private buildConsumers(): CheckpointedConsumer[] {
    const checkpoints = new Set<string>();
    return this.handlers().map(({ handler, name, kind }): CheckpointedConsumer => {
      if (checkpoints.has(name)) {
        throw new Error(`Duplicate checkpoint '${name}'`);
      }
      checkpoints.add(name);
      const checkpoint = this.checkpointFor(name);
      const driven =
        kind === 'processor' ? new ContinuedLineageHandler(handler, this.lineage) : handler;
      const subscription = new PollingSubscription(this.events, driven, checkpoint, {
        unitOfWork: this.unitOfWork,
        name,
      });
      const shape = { name, checkpoint, subscription };
      // The one cast, at the one narrowing point: @CheckpointedProjection's
      // decorator⇄hierarchy lint rule is what makes it sound.
      return kind === 'projection'
        ? { ...shape, kind, handler: handler as Projection }
        : { ...shape, kind, handler };
    });
  }

  private handlers(): { handler: EventHandler; name: string; kind: CheckpointKind }[] {
    return this.discovery
      .getProviders()
      .map((wrapper) => wrapper.instance)
      .filter((instance): instance is EventHandler => isCheckpointed(instance))
      .map((handler) => {
        const metadata = checkpointMetadata(handler.constructor);
        return { handler, name: metadata?.name as string, kind: metadata?.kind as CheckpointKind };
      });
  }

  private startPolling(): void {
    from(this.consumers.map((consumer) => consumer.subscription))
      .pipe(
        mergeMap(this.wakeSubscription()),
        takeUntil(this.stopped),
      )
      .subscribe();
  }

  private wakeSubscription() {
    return (subscription: Subscription) => pollSchedule(this.notifications, this.pollIntervalMs).pipe(
      exhaustMap(() => subscription.poll()),
      // ponytail: exponential backoff, capped, reset once a poll succeeds. Infinite
      // retries are deliberate — a transient store outage should recover, not kill
      // the consumer. A poison event (handler throws on the same event every time)
      // still replays forever; skipping it needs per-event dead-lettering inside
      // poll(), which is a durable-store concern — deferred until Postgres.
      // A checkpoint conflict is not a failure: it means a concurrent writer — a
      // rebuild's reset, or another instance during a deploy overlap — owns the
      // position this poll expected. The retry re-reads and continues from wherever
      // the checkpoint actually is, so it logs quietly, not as an error.
      retry({
        resetOnSuccess: true,
        delay: (error, retryCount) => {
          if (error instanceof CheckpointConflictError) {
            this.logger.log(`Subscription poll yielded to a concurrent writer: ${error.message}`);
          } else {
            this.logger.error('Subscription poll failed', error);
          }
          return timer(Math.min(RETRY_BACKOFF_MS * 2 ** (retryCount - 1), MAX_RETRY_BACKOFF_MS));
        },
      }),
    );
  }
}

// The background poller treats a checkpoint conflict as a retry signal; a poll asked
// for directly — drain(), rebuild() — treats it as done. It means a concurrent poll
// owns the position and is draining the same backlog: whichever poll wins each event's
// CAS carries the drain to the end, and the loser has nothing left to do (ADR 0036).
function poll(subscription: Subscription): Promise<void> {
  return subscription.poll().catch((error: unknown) => {
    if (!(error instanceof CheckpointConflictError)) {
      throw error;
    }
  });
}

function isCheckpointed(instance: unknown): instance is EventHandler {
  return (
    typeof instance === 'object' &&
    instance !== null &&
    checkpointMetadata(instance.constructor) !== undefined
  );
}
