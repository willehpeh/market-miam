import { Clock, Instant, LocalDate } from '@market-miam/common';

// Typed as Clock so a new method on the port breaks here once, not as four stale
// structural fakes. The default instant is mid-morning UTC on the same day — specs
// that care about the exact moment pass their own.
export const clockAt = (date: string, now = `${date}T09:00:00.000Z`): Clock => ({
  today: () => new LocalDate(date),
  now: () => new Instant(now),
});
