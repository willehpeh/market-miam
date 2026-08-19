import { Instant, LocalDate, LocalDateTime, LocalTime } from '@market-miam/common';

type Timed = { date: string; startTime?: string; endTime?: string };

// ponytail: Europe/Paris is the single-region calendar constant; becomes a Market timezone
// attribute when multi-region. h23 avoids the ICU 24:00 midnight quirk, which LocalTime
// rejects outright.
export function parisWallClock(now: Instant): LocalDateTime {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris', hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).formatToParts(new Date(now.value()));
  const at = (type: string) => parts.find(part => part.type === type)?.value ?? '';
  return new LocalDateTime(
    new LocalDate(`${at('year')}-${at('month')}-${at('day')}`),
    new LocalTime(`${at('hour')}:${at('minute')}`),
  );
}

// The stamp the availability events carry — what time it is at the market, right now.
export function parisTime(now: Instant): LocalTime {
  return parisWallClock(now).time();
}

export function wallClockOn(day: Timed, time: string): LocalDateTime {
  return new LocalDateTime(new LocalDate(day.date), new LocalTime(time));
}

// A market day lives until it ends, not until it starts — customers want the menu during
// the market, and a vendor plans the morning of. No endTime falls back to the end of the
// calendar day, and no startTime to its beginning, so a day counts as started once its
// date arrives.
export function notYetEnded(day: Timed, now: LocalDateTime): boolean {
  return now.isNotAfter(wallClockOn(day, day.endTime || '23:59'));
}

export function hasStarted(day: Timed, now: LocalDateTime): boolean {
  return wallClockOn(day, day.startTime || '00:00').isNotAfter(now);
}

// Where now sits against this day, in one reading (decision 56). Two date words for the
// days either side, three market words for today. Clock truth only — nothing the vendor
// does moves it, which is what keeps it apart from `closed` and `absent`.
export type MarketDayPhase = 'future' | 'due' | 'trading' | 'over' | 'past';

// Computed here rather than inline in each handler: stamping it twice is how the list and
// the point lookup came to disagree about what a past day is. Untimed days keep the
// fallbacks above — no startTime counts as the start of the day, no endTime as 23:59 —
// so an untimed today reads as trading throughout.
export function phaseOf(day: Timed, now: LocalDateTime): MarketDayPhase {
  if (!wallClockOn(day, '00:00').isNotAfter(now)) {
    return 'future';
  }
  if (!now.isNotAfter(wallClockOn(day, '23:59'))) {
    return 'past';
  }
  if (!hasStarted(day, now)) {
    return 'due';
  }
  return notYetEnded(day, now) ? 'trading' : 'over';
}
