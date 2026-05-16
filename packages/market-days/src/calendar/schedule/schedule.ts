import { ScheduleName } from './schedule-name';
import { ScheduleDay } from './schedule-day';
import { ScheduleFrequency } from './schedule-frequency';
import { ConflictingScheduleError, InvalidScheduleError } from '../errors';
import { ScheduleId } from './schedule-id';

type ScheduleSnapshot = {
  scheduleId: string;
  scheduleName: string;
  days: { day: string; startTime?: string; endTime?: string }[];
  every: { weeks: number };
};

export class Schedule {
  private readonly _days: ScheduleDay[] = [];
  private _frequency = new ScheduleFrequency();

  static fromSnapshot(snapshot: ScheduleSnapshot): Schedule {
    const schedule = new Schedule(
      new ScheduleId(snapshot.scheduleId),
      new ScheduleName(snapshot.scheduleName)
    );
    snapshot.days.forEach(d => schedule._days.push(new ScheduleDay(d.day, d.startTime, d.endTime)));
    schedule._frequency = new ScheduleFrequency(snapshot.every);
    return schedule;
  }

  constructor(private readonly _id: ScheduleId,
              private readonly _name: ScheduleName) {
  }

  repeatEvery(frequency: ScheduleFrequency): void {
    this._frequency = frequency;
  }

  addDays(days: ScheduleDay[]): void {
    if (days.length === 0) {
      throw new InvalidScheduleError('Schedule must have at least one day');
    }
    days.forEach(day => this.addDay(day));
  }

  addDay(day: ScheduleDay): void {
    if (this.hasConflict(day)) {
      throw new ConflictingScheduleError();
    }
    this._days.push(day);
  }

  conflictsWith(other: Schedule) {
    return this._days.some(existing => other._days.some(otherDay => existing.overlapsWith(otherDay)));
  }

  snapshot(): ScheduleSnapshot {
    return {
      scheduleId: this._id.value(),
      scheduleName: this._name.value(),
      days: this._days.map(d => d.value()),
      every: this._frequency.value(),
    };
  }

  private hasConflict(day: ScheduleDay) {
    return this._days.some(existing => existing.overlapsWith(day));
  }
}
