import { Inject, Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { catchError, EMPTY, exhaustMap, from, Observable, Subject, takeUntil, timer } from 'rxjs';
import { Clock } from '@market-miam/common';
import { DataKeys } from '@market-miam/event-sourcing';

// Each emission means "shred whatever keys are due now". Tests swap in their own ticks.
export const SHRED_SWEEP_TICKS = 'SHRED_SWEEP_TICKS';

const DAY_MS = 24 * 60 * 60 * 1000;

// ponytail: an in-process timer, from boot then daily, so a due key dies within a day. It
// relies on the API never sleeping (Render's paid plans don't). If it ever does, run
// shredDue from a Render Cron Job through an apps/api entry point, not raw SQL.
export const dailyShredSweep = { provide: SHRED_SWEEP_TICKS, useFactory: () => timer(0, DAY_MS) };

// Ends the retention of keys that outlive their subject's erasure (ADR 0056).
@Injectable()
export class ShredSweep implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly stopped = new Subject<void>();
  private readonly logger = new Logger(ShredSweep.name);

  constructor(
    private readonly keys: DataKeys,
    private readonly clock: Clock,
    @Inject(SHRED_SWEEP_TICKS) private readonly ticks: Observable<unknown>,
  ) {}

  onApplicationBootstrap(): void {
    this.ticks
      .pipe(
        exhaustMap(() =>
          from(this.keys.shredDue(new Date(this.clock.now().value()))).pipe(
            // A failed sweep must not end the stream: the next tick tries again.
            catchError((error: unknown) => {
              this.logger.error('Shred sweep failed', error instanceof Error ? error.stack : String(error));
              return EMPTY;
            }),
          ),
        ),
        takeUntil(this.stopped),
      )
      .subscribe();
  }

  onApplicationShutdown(): void {
    this.stopped.next();
    this.stopped.complete();
  }
}
