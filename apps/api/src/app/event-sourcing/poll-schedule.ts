import { map, merge, Observable, timer } from 'rxjs';

const POLL_INTERVAL_MS = 30000;

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
