import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
  Optional,
} from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import { defer, merge, repeat, retry, Subject, takeUntil, timer } from 'rxjs';
import {
  checkpointMetadata,
  EventHandler,
  Events,
  InMemoryCheckpoint,
  InMemorySubscription,
  MessageContext,
  Subscription,
} from '@market-monster/event-sourcing';
import { TracingEventHandler } from './tracing.event-handler';
import { ContinuationContextHandler } from './continuation-context.handler';

export const POLLING_ENABLED = Symbol('POLLING_ENABLED');

const POLL_INTERVAL_MS = 1000;

// Discovers @CheckpointedProjection / @CheckpointedProcessor handlers across the
// app, builds a checkpoint-driven, instrumented subscription for each, and — in
// production — drives them on independent polling streams (each isolated from
// the others' failures). Processors additionally get the continuation
// message-context wrapping. Tests pump drain() deterministically.
@Injectable()
export class ConsumerRunner implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly stopped = new Subject<void>();
  private subscriptions: Subscription[] = [];

  constructor(
    private readonly discovery: DiscoveryService,
    private readonly events: Events,
    private readonly context: MessageContext,
    @Inject(POLLING_ENABLED) private readonly pollingEnabled: boolean,
    @Optional() private readonly logger: Logger = new Logger(ConsumerRunner.name),
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

  // Deterministic seam for tests. A processor's output feeds another subscription
  // (its event lands in a view projection), so one pass per subscription drains
  // the whole chain to quiescence.
  async drain(): Promise<void> {
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
      return new InMemorySubscription(
        this.events,
        new TracingEventHandler(driven),
        new InMemoryCheckpoint(name),
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
    merge(
      ...this.subscriptions.map((subscription) =>
        defer(() => subscription.poll()).pipe(
          repeat({ delay: () => timer(POLL_INTERVAL_MS) }),
          retry({
            delay: (error) => {
              this.logger.error('Subscription poll failed', error);
              return timer(POLL_INTERVAL_MS);
            },
          }),
        ),
      ),
    )
      .pipe(takeUntil(this.stopped))
      .subscribe();
  }
}

function isCheckpointed(instance: unknown): instance is EventHandler {
  return (
    typeof instance === 'object' &&
    instance !== null &&
    checkpointMetadata(instance.constructor) !== undefined
  );
}
