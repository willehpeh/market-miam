import { Inject, Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown, Optional } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import { exhaustMap, from, mergeMap, retry, Subject, takeUntil, timer } from 'rxjs';
import { Exception, SpanStatusCode, trace } from '@opentelemetry/api';
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
import { PollSchedule } from './poll-schedule';

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
// guarantee that a @CheckpointedProjection class implements Projection is the
// decorator's constrained signature, checked by the compiler at every use site.
type CheckpointedConsumer =
  | (ConsumerShape & { readonly kind: 'projection'; readonly handler: Projection })
  | (ConsumerShape & { readonly kind: 'processor'; readonly handler: EventHandler });

export interface SubscriptionStatus {
  name: string;
  kind: CheckpointKind;
  consecutiveFailures: number;
}

@Injectable()
export class Subscriptions implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly stopped = new Subject<void>();
  private consumers: CheckpointedConsumer[] = [];
  // Consecutive real failures per consumer, kept by the background poller — what the
  // health route reads. Conflicts never count; a successful poll clears the entry.
  private readonly failures = new Map<string, number>();

  constructor(
    private readonly discovery: DiscoveryService,
    private readonly events: Events,
    private readonly lineage: Lineage,
    // Required, not optional: every profile must state its wake policy. A module
    // that forgets fails at boot instead of silently never polling.
    private readonly schedule: PollSchedule,
    @Optional() @Inject(CHECKPOINT_FACTORY) private readonly checkpointFor: CheckpointFactory = (name) => new InMemoryCheckpoint(name),
    @Optional() @Inject(UnitOfWork) private readonly unitOfWork: UnitOfWork = UnitOfWork.none(),
    @Optional() private readonly logger: Logger = new Logger(Subscriptions.name),
  ) {}

  onApplicationBootstrap(): void {
    this.consumers = this.buildConsumers();
    this.startPolling();
  }

  onApplicationShutdown(): void {
    this.stopped.next();
    this.stopped.complete();
  }

  status(): SubscriptionStatus[] {
    return this.consumers.map(({ name, kind }) => ({
      name,
      kind,
      consecutiveFailures: this.failures.get(name) ?? 0,
    }));
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
      // Sound: only @CheckpointedProjection stamps kind 'projection', and its
      // signature only accepts classes implementing Projection.
      return kind === 'projection'
        ? { ...shape, kind, handler: handler as Projection }
        : { ...shape, kind, handler };
    });
  }

  private handlers(): { handler: EventHandler; name: string; kind: CheckpointKind }[] {
    return this.discovery.getProviders().flatMap((wrapper) => {
      const instance: unknown = wrapper.instance;
      if (typeof instance !== 'object' || instance === null) {
        return [];
      }
      const metadata = checkpointMetadata(instance.constructor);
      if (!metadata) {
        return [];
      }
      // Sound: only the @Checkpointed* decorators stamp metadata, and their
      // signatures only accept EventHandler classes.
      return [{ handler: instance as EventHandler, ...metadata }];
    });
  }

  private startPolling(): void {
    from(this.consumers)
      .pipe(
        mergeMap(this.wakeSubscription()),
        takeUntil(this.stopped),
      )
      .subscribe();
  }

  private wakeSubscription() {
    return (consumer: CheckpointedConsumer) => this.schedule.pokes().pipe(
      exhaustMap(() => consumer.subscription.poll().then(() => this.failures.delete(consumer.name))),
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
            this.pollFailed(consumer, retryCount, error);
          }
          return timer(Math.min(RETRY_BACKOFF_MS * 2 ** (retryCount - 1), MAX_RETRY_BACKOFF_MS));
        },
      }),
    );
  }

  // The retry callback is the only seam that knows recovery depth (resetOnSuccess, so
  // retryCount is consecutive-failure depth). It feeds both alert transports: the wide
  // error span Honeycomb can query — and trigger on, should a slot free up — and the
  // in-memory count the health route serves to whatever pages instead.
  private pollFailed(consumer: CheckpointedConsumer, retryCount: number, error: unknown): void {
    this.failures.set(consumer.name, retryCount);
    const span = trace.getTracer('subscriptions').startSpan('subscription poll failed', {
      attributes: {
        'subscription.name': consumer.name,
        'subscription.kind': consumer.kind,
        'subscription.retry_count': retryCount,
        'exception.slug': 'subscription-poll-failed',
      },
    });
    span.recordException(error as Exception);
    span.setStatus({ code: SpanStatusCode.ERROR });
    span.end();
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
