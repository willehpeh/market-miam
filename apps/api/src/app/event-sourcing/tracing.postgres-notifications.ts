import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { trace } from '@opentelemetry/api';
import { Observable, Subscription } from 'rxjs';
import { ListenStatus, PostgresNotifications } from '@market-miam/event-sourcing';

const tracer = trace.getTracer('pg-notifications');

// Nest + OTel boundary around the framework-free PostgresNotifications: drives its
// start/stop lifecycle, turns each LISTEN state transition into a marker span plus a
// log line, and re-exposes the poke stream for the EVENT_NOTIFICATIONS token.
@Injectable()
export class TracingPostgresNotifications implements OnApplicationBootstrap, OnApplicationShutdown {
  private statusSubscription?: Subscription;

  constructor(
    private readonly inner: PostgresNotifications,
    private readonly logger: Logger = new Logger('PostgresNotifications'),
  ) {}

  notifications(): Observable<void> {
    return this.inner.notifications();
  }

  async onApplicationBootstrap(): Promise<void> {
    // status() is a ReplaySubject(1), so subscribe/start order doesn't matter — a
    // subscriber always sees the latest transition.
    this.statusSubscription = this.inner.status().subscribe((status) => this.mark(status));
    await this.inner.start();
  }

  async onApplicationShutdown(): Promise<void> {
    await this.inner.stop();
    this.statusSubscription?.unsubscribe();
  }

  private mark({ state, attempt, error }: ListenStatus): void {
    const span = tracer.startSpan(`pg-listen ${state}`);
    span.setAttribute('listen.state', state);
    span.setAttribute('reconnect.attempt', attempt);
    if (error !== undefined) {
      span.setAttribute('error.message', error instanceof Error ? error.message : String(error));
    }
    span.end();
    if (state === 'dropped') {
      this.logger.error(`LISTEN ${state}`, error);
    } else {
      this.logger.log(`LISTEN ${state}`);
    }
  }
}
