import { map, merge, Observable, timer } from 'rxjs';

// LISTEN/NOTIFY drives latency now; this interval is the safety net that catches
// any poke missed while the LISTEN connection reconnects. 5s (not 30s) — keep it
// short until LISTEN is proven, since a broken LISTEN is invisible behind a long timer.
const POLL_INTERVAL_MS = 5000;

// Emits a tick immediately, on every interval (the safety net), and whenever a
// notification pokes — every moment Subscriptions should poll.
export function pollSchedule(
  notifications: Observable<void>,
  intervalMs = POLL_INTERVAL_MS,
): Observable<void> {
  return merge(timer(0, intervalMs), notifications).pipe(map(() => undefined));
}
