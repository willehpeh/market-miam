import { ScheduleName } from './schedule-name';
import { ScheduleDay } from './schedule-day';
import { ScheduleFrequency } from './schedule-frequency';
import { ConflictingScheduleError, InvalidScheduleError } from '../errors';
import { ScheduleId } from './schedule-id';
import { LocalDate } from '@market-monster/common';

type ScheduleSnapshot = {
  scheduleId: string;
  scheduleName: string;
  startDate: string;
  days: { day: string; startTime?: string; endTime?: string }[];
  every: { weeks: number };
};

type ScheduleParams = {
  id: ScheduleId;
  name: ScheduleName;
  startDate: LocalDate;
  days: ScheduleDay[];
  frequency?: ScheduleFrequency;
};

export class Schedule {
  private readonly _id: ScheduleId;
  private readonly _name: ScheduleName;
  private readonly _startDate: LocalDate;
  private readonly _days: ScheduleDay[] = [];
  private readonly _frequency: ScheduleFrequency;

  constructor(params: ScheduleParams) {
    this._id = params.id;
    this._name = params.name;
    this._startDate = params.startDate;
    this._frequency = params.frequency ?? new ScheduleFrequency();
    this.addDays(params.days);
  }

  static fromSnapshot(snapshot: ScheduleSnapshot): Schedule {
    return new Schedule({
      id: new ScheduleId(snapshot.scheduleId),
      name: new ScheduleName(snapshot.scheduleName),
      startDate: new LocalDate(snapshot.startDate),
      days: snapshot.days.map(d => new ScheduleDay(d.day, d.startTime, d.endTime)),
      frequency: new ScheduleFrequency(snapshot.every),
    });
  }

  conflictsWith(other: Schedule) {
    return this._days.some(existing => other._days.some(otherDay => existing.overlapsWith(otherDay)));
  }

  snapshot(): ScheduleSnapshot {
    return {
      scheduleId: this._id.value(),
      scheduleName: this._name.value(),
      startDate: this._startDate.value(),
      days: this._days.map(d => d.value()),
      every: this._frequency.value()
    };
  }

  private addDays(days: ScheduleDay[]): void {
    if (days.length === 0) {
      throw new InvalidScheduleError('Schedule must have at least one day');
    }
    days.forEach(day => {
      if (this._days.some(existing => existing.overlapsWith(day))) {
        throw new ConflictingScheduleError();
      }
      this._days.push(day);
    });
  }
}
