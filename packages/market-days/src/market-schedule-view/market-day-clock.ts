import { Instant, LocalDate, LocalDateTime, LocalTime } from '@market-miam/common';
import { MarketHours } from '../market-day/market-hours';

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

const MIDNIGHT = new LocalTime('00:00');
const END_OF_DAY = new LocalTime('23:59');

function hoursOf(day: Timed): MarketHours {
  return new MarketHours(day.startTime, day.endTime);
}

// The time a day opens, in the form the vendor's list sorts on (decision 25).
export function opensAt(day: Timed): string {
  return hoursOf(day).opening().value();
}

function wallClockOn(day: Timed, time: LocalTime): LocalDateTime {
  return new LocalDateTime(new LocalDate(day.date), time);
}

// A stand shut before its market opened was called off, not traded (decision 75) — the
// vendor never stood there, so the day is never finished, never judged, and never worth
// prompting about. The aggregate draws the same line at market-day.ts, off the same hours.
export function calledOff(day: Timed, closedAt?: string): boolean {
  return !!closedAt && hoursOf(day).opening().isAfter(new LocalTime(closedAt));
}

// A market day lives until it ends, not until it starts — customers want the menu during
// the market, and a vendor plans the morning of. What a missing time means is MarketHours'
// to say (decision 62).
export function notYetEnded(day: Timed, now: LocalDateTime): boolean {
  return now.isNotAfter(wallClockOn(day, hoursOf(day).closing()));
}

// Where now sits against this day, in one reading (decision 56). Two date words for the
// days either side, three market words for today. Clock truth only — nothing the vendor
// does moves it, which is what keeps it apart from `closed` and `absent`.
export type MarketDayPhase = 'future' | 'due' | 'trading' | 'over' | 'past';

// Where now stands against this day, and how long that has left. Computed here rather than
// inline in each handler: stamping it twice is how the list and the point lookup came to
// disagree about what a past day is, and one walk of the boundaries answers both questions,
// where deriving the countdown from the phase afterwards would put the same closing time in
// two places (decisions 56, 59). Untimed days keep MarketHours' fallbacks, so an untimed
// today reads as trading throughout.
export type MarketDayStanding = { phase: MarketDayPhase; nextPhaseInMs?: number };

export function standingOf(day: Timed, now: LocalDateTime): MarketDayStanding {
  const hours = hoursOf(day);
  if (!wallClockOn(day, MIDNIGHT).isNotAfter(now)) {
    return { phase: 'future' };
  }
  const endOfDay = wallClockOn(day, END_OF_DAY);
  if (!now.isNotAfter(endOfDay)) {
    return { phase: 'past' };
  }
  const opening = wallClockOn(day, hours.opening());
  if (!opening.isNotAfter(now)) {
    return { phase: 'due', nextPhaseInMs: untilAfter(now, opening) };
  }
  const closing = wallClockOn(day, hours.closing());
  return now.isNotAfter(closing)
    ? { phase: 'trading', nextPhaseInMs: untilAfter(now, closing) }
    : { phase: 'over', nextPhaseInMs: untilAfter(now, endOfDay) };
}

// The clock reads whole minutes, so a phase runs through the whole minute of its boundary
// and the next one begins sixty seconds later — which is the moment the name promises.
// Counting to the boundary itself would say zero for that minute, and a timer set for zero
// re-asks instantly, gets zero again, and spins until the minute turns.
function untilAfter(now: LocalDateTime, boundary: LocalDateTime): number {
  return now.millisUntil(boundary) + 60_000;
}
