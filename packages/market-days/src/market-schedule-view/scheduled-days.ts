import { LocalDate } from '@market-miam/common';
import { Occurrence, Recurrence } from '../calendar/schedule/recurrence';
import { MarketScheduleView } from './market-schedule-view';

// A day the schedule puts the vendor at a market, and whether they declared themselves away
// for it. One home for the expansion all three day reads were doing for themselves: the
// window query flagged the absence, the point lookup asked a private predicate, and the
// bilan prompt filtered on it — three spellings of one range test.
export type ScheduledDay = Occurrence & { absent: boolean };

// Absence is said here and acted on by the caller: the window flags it and suppresses the
// menu, the prompt drops the day outright. Suppression stays in the query either way, so
// there is still no cross-aggregate coupling between calendar and market day.
export function scheduledDays(schedule: MarketScheduleView, from: LocalDate, to: LocalDate): ScheduledDay[] {
  return Recurrence.fromSnapshot(schedule)
    .occurrencesWithin(from, to)
    .map(occurrence => ({ ...occurrence, absent: isAbsent(schedule, occurrence.date) }));
}

// Inclusive both ends: a one-day absence is recorded as a range whose bounds are the same
// date, so a half-open test would let that day through.
function isAbsent(schedule: MarketScheduleView, date: string): boolean {
  return (schedule.absences ?? []).some(range => range.from <= date && date <= range.to);
}
