import { EMPTY, map, merge, Observable, timer } from 'rxjs';

// The wake policy for subscriptions: each emission means "poll now". The private
// constructor is the invariant — a schedule is only expressible as one of the
// named policies below, so a profile cannot accidentally provide bare pokes and
// silently lose the backstop. Cold and per-subscriber by contract: never share()
// the stream — Subscriptions owns teardown via takeUntil, and a retry relies on
// resubscription yielding a fresh leading tick.
export class PollSchedule {
  private constructor(private readonly source: Observable<void>) {}

  // Pokes are the drive, the timer is the backstop — not the other way round.
  // LISTEN/NOTIFY (postgres) or on-append pokes (in-memory) carry every event: a
  // week of handler spans showed 4-275ms from commit to handler, against the
  // ~2.5min mean the timer alone would give. A dropped LISTEN reconnects and
  // fires its own catch-up poke, and the leading zero polls immediately on
  // startup, so what is left for the timer is the narrow race where a poke lands
  // mid-poll and exhaustMap discards it. Five minutes bounds that without paying
  // for 11.5k idle polls a day.
  static pokedWithBackstop(pokes: Observable<void>, backstopMs = 300_000): PollSchedule {
    return new PollSchedule(merge(timer(0, backstopMs), pokes).pipe(mapToUndefined()));
  }

  // No polling at all — the test harness drives projections explicitly via drain().
  static never(): PollSchedule {
    return new PollSchedule(EMPTY);
  }

  pokes(): Observable<void> {
    return this.source;
  }
}

function mapToUndefined() {
  return map((): void => undefined);
}
