import { map, merge, Observable, timer } from 'rxjs';

const POLL_INTERVAL_MS = 30000;

// Emits a tick immediately, on every interval (the safety net), and whenever a
// notification pokes — every moment Subscriptions should poll.
export function pollSchedule(
  notifications: Observable<void>,
  intervalMs = POLL_INTERVAL_MS,
): Observable<void> {
  return merge(timer(0, intervalMs), notifications).pipe(map(() => undefined));
}
