import { LocalDate, Week } from '@market-miam/common';
import { ScheduleDay } from './schedule-day';
import { ScheduleFrequency } from './schedule-frequency';
import { InvalidScheduleError } from '../errors';
import { DateRange } from '../date-range';

export type RecurrenceSnapshot = {
  startDate: string;
  days: { day: string; startTime?: string; endTime?: string }[];
  frequency: { weeks: number } | 'once';
};

export type Occurrence = {
  date: string;
  day: string;
  startTime?: string;
  endTime?: string;
};

export class Recurrence {
  private readonly _startDate: LocalDate;
  private readonly _firstWeek: Week;
  private readonly _days: ScheduleDay[] = [];
  private readonly _frequency: ScheduleFrequency;

  constructor(startDate: LocalDate, days: ScheduleDay[], frequency?: ScheduleFrequency) {
    if (days.length === 0) {
      throw new InvalidScheduleError('Schedule must have at least one day');
    }
    this._startDate = startDate;
    this._firstWeek = Week.containing(startDate);
    this._frequency = frequency ?? new ScheduleFrequency();
    this._days.push(...days);
  }

  static fromSnapshot(snapshot: RecurrenceSnapshot): Recurrence {
    return new Recurrence(
      new LocalDate(snapshot.startDate),
      snapshot.days.map(d => new ScheduleDay(d.day, d.startTime, d.endTime)),
      new ScheduleFrequency(snapshot.frequency)
    );
  }

  snapshot(): RecurrenceSnapshot {
    return {
      startDate: this._startDate.value(),
      days: this._days.map(d => d.value()),
      frequency: this._frequency.value()
    };
  }

  occurrencesWithin(from: LocalDate, to: LocalDate): Occurrence[] {
    if (to.isBefore(this._startDate)) {
      return [];
    }
    const range = new DateRange(from, to).notBefore(this._startDate);
    return range.dates().reduce<Occurrence[]>((occurrences, date) => {
      const scheduledDay = this.scheduledDayOn(date);
      if (!scheduledDay) {
        return occurrences;
      }
      occurrences.push({ ...scheduledDay.value(), date: date.value() });
      return occurrences;
    }, []);
  }

  private scheduledDayOn(date: LocalDate): ScheduleDay | undefined {
    if (!this.recursInWeekOf(date)) {
      return undefined;
    }
    return this._days.find(day => day.fallsOn(date));
  }

  private recursInWeekOf(date: LocalDate): boolean {
    return this._frequency.recursAfter(this._firstWeek.countUntil(Week.containing(date)));
  }
}
