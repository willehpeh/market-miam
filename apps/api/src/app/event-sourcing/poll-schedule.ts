import { map, merge, Observable, timer } from 'rxjs';

// Backstop, not the drive: LISTEN/NOTIFY pokes carry every append in production
// (measured 4-275ms from commit to handler over a week, against the ~2.5min mean this
// timer would give). A dropped LISTEN reconnects and fires its own catch-up poke, and
// a restart polls immediately on the leading zero, so what is left for the timer is
// the narrow race where a poke lands mid-poll and exhaustMap discards it. Five minutes
// bounds that without paying for 11.5k idle polls a day.
const POLL_INTERVAL_MS = 300_000;

export function pollSchedule(
  notifications: Observable<void>,
  intervalMs = POLL_INTERVAL_MS,
): Observable<void> {
  const tick = timer(0, intervalMs);
  return merge(tick, notifications).pipe(mapToUndefined());
}

function mapToUndefined() {
  return map(() => undefined);
}
