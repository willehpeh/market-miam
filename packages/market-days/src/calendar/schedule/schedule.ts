import { ScheduleDay } from './schedule-day';
import { ScheduleFrequency } from './schedule-frequency';
import { InvalidScheduleError } from '../errors';
import { ScheduleId } from './schedule-id';
import { LocalDate } from '@market-miam/common';

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
  private static readonly WEEKDAY_INDEX: Record<string, number> = { MON: 0, TUE: 1, WED: 2, THU: 3, FRI: 4, SAT: 5, SUN: 6 };

  private readonly _id: ScheduleId;
  private readonly _startDate: LocalDate;
  private readonly _days: ScheduleDay[] = [];
  private readonly _frequency: ScheduleFrequency;

  constructor(params: ScheduleParams) {
    this._id = params.id;
    this._startDate = params.startDate;
    this._frequency = params.frequency ?? new ScheduleFrequency();
    this.addDays(params.days);
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

  static fromSnapshot(snapshot: ScheduleSnapshot): Schedule {
    return new Schedule({
      id: new ScheduleId(snapshot.scheduleId),
      startDate: new LocalDate(snapshot.startDate),
      days: snapshot.days.map(d => new ScheduleDay(d.day, d.startTime, d.endTime)),
      frequency: new ScheduleFrequency(snapshot.frequency),
    });
  }

  occurrencesWithin(from: LocalDate, to: LocalDate): ScheduleOccurrence[] {
    const occurrences: ScheduleOccurrence[] = [];
    for (let date = this.laterOf(from, this._startDate); !to.isBefore(date); date = date.plusDays(1)) {
      const scheduleDay = this._days.find(day => day.value().day === date.dayOfWeek());
      if (scheduleDay && this.recursOn(date)) {
        occurrences.push({ scheduleId: this._id.value(), date: date.value(), ...scheduleDay.value() });
      }
    }
    return occurrences;
  }

  private laterOf(a: LocalDate, b: LocalDate): LocalDate {
    return a.isBefore(b) ? b : a;
  }

  private recursOn(date: LocalDate): boolean {
    const frequency = this._frequency.value();
    if (frequency === 'once') {
      return this.mondayOf(date).value() === this.mondayOf(this._startDate).value();
    }
    if (frequency.weeks === 1) {
      return true;
    }
    let weeks = 0;
    for (let monday = this.mondayOf(this._startDate); monday.isBefore(this.mondayOf(date)); monday = monday.plusDays(7)) {
      weeks++;
    }
    return weeks % frequency.weeks === 0;
  }

  private mondayOf(date: LocalDate): LocalDate {
    return date.plusDays(-Schedule.WEEKDAY_INDEX[date.dayOfWeek()]);
  }

  private addDays(days: ScheduleDay[]): void {
    if (days.length === 0) {
      throw new InvalidScheduleError('Schedule must have at least one day');
    }
    this._days.push(...days);
  }
}
