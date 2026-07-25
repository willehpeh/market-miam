import { ScheduleDay } from './schedule-day';
import { ScheduleFrequency } from './schedule-frequency';
import { InvalidScheduleError } from '../errors';
import { ScheduleId } from './schedule-id';
import { LocalDate, LocalDateRange, Week } from '@market-miam/common';

type ScheduleSnapshot = {
  scheduleId: string;
  startDate: string;
  days: { day: string; startTime?: string; endTime?: string }[];
  frequency: { weeks: number } | 'once';
};

export type ScheduleOccurrence = {
  scheduleId: string;
  date: string;
  day: string;
  startTime?: string;
  endTime?: string;
};

type ScheduleParams = {
  id: ScheduleId;
  startDate: LocalDate;
  days: ScheduleDay[];
  frequency?: ScheduleFrequency;
};

export class Schedule {
  private readonly _id: ScheduleId;
  private readonly _startDate: LocalDate;
  private readonly _firstWeek: Week;
  private readonly _days: ScheduleDay[] = [];
  private readonly _frequency: ScheduleFrequency;

  constructor(params: ScheduleParams) {
    if (params.days.length === 0) {
      throw new InvalidScheduleError('Schedule must have at least one day');
    }
    this._id = params.id;
    this._startDate = params.startDate;
    this._firstWeek = Week.containing(params.startDate);
    this._frequency = params.frequency ?? new ScheduleFrequency();
    this._days.push(...(params.days));
  }

  static fromSnapshot(snapshot: ScheduleSnapshot): Schedule {
    return new Schedule({
      id: new ScheduleId(snapshot.scheduleId),
      startDate: new LocalDate(snapshot.startDate),
      days: snapshot.days.map(d => new ScheduleDay(d.day, d.startTime, d.endTime)),
      frequency: new ScheduleFrequency(snapshot.frequency)
    });
  }

  snapshot(): ScheduleSnapshot {
    return {
      scheduleId: this._id.value(),
      startDate: this._startDate.value(),
      days: this._days.map(d => d.value()),
      frequency: this._frequency.value()
    };
  }

  id(): ScheduleId {
    return this._id;
  }

  occurrencesWithin(from: LocalDate, to: LocalDate): ScheduleOccurrence[] {
    const range = new LocalDateRange(from, to).notBefore(this._startDate);
    return range.dates().reduce<ScheduleOccurrence[]>((occurrences, date) => {
      const scheduledDay = this.scheduledDayOn(date);
      if (!scheduledDay) {
        return occurrences;
      }
      occurrences.push({
        ...scheduledDay.value(),
        scheduleId: this._id.value(),
        date: date.value()
      });
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
