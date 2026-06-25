import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import { defer, merge, repeat, retry, Subject, takeUntil, timer } from 'rxjs';
import {
  EventHandler,
  Events,
  InMemoryCheckpoint,
  InMemorySubscription,
  projectsCheckpoint,
  Subscription,
} from '@market-monster/event-sourcing';
import { TracingEventHandler } from './tracing.event-handler';

export const POLLING_ENABLED = Symbol('POLLING_ENABLED');

const POLL_INTERVAL_MS = 1000;

// Discovers @Projects-decorated projections across the app, builds a
// checkpoint-driven, instrumented subscription for each, and — in production —
// drives them on independent polling streams (each isolated from the others'
// failures). Tests pump drain() deterministically instead of the timer.
@Injectable()
export class ConsumerRunner implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(ConsumerRunner.name);
  private readonly stopped = new Subject<void>();
  private subscriptions: Subscription[] = [];

  constructor(
    private readonly discovery: DiscoveryService,
    private readonly events: Events,
    @Inject(POLLING_ENABLED) private readonly pollingEnabled: boolean,
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

  // Deterministic seam for tests: process every subscription once.
  async drain(): Promise<void> {
    await Promise.all(this.subscriptions.map((subscription) => subscription.poll()));
  }

  private buildSubscriptions(): Subscription[] {
    const checkpoints = new Set<string>();
    return this.projections().map((projection) => {
      const checkpoint = projectsCheckpoint(projection.constructor) as string;
      if (checkpoints.has(checkpoint)) {
        throw new Error(`Duplicate projection checkpoint '${checkpoint}'`);
      }
      checkpoints.add(checkpoint);
      return new InMemorySubscription(
        this.events,
        new TracingEventHandler(projection),
        new InMemoryCheckpoint(checkpoint),
      );
    });
  }

  private projections(): EventHandler[] {
    return this.discovery
      .getProviders()
      .map((wrapper) => wrapper.instance)
      .filter((instance): instance is EventHandler => isProjection(instance));
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

function isProjection(instance: unknown): instance is EventHandler {
  return (
    typeof instance === 'object' &&
    instance !== null &&
    projectsCheckpoint(instance.constructor) !== undefined
  );
}
