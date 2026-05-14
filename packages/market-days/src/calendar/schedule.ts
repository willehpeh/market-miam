import { ScheduleName } from './schedule-name';
import { ScheduleDay } from './schedule-day';
import { ScheduleFrequency } from './schedule-frequency';
import { ConflictingScheduleError } from './conflicting-schedule.error';
import { ScheduleSnapshot } from './schedule-snapshot';
import { InvalidScheduleError } from '@market-monster/market-days';

export class Schedule {
  private readonly _id: string;
  private readonly _name: ScheduleName;
  private readonly _days: ScheduleDay[] = [];
  private _frequency = new ScheduleFrequency();

  constructor(name: ScheduleName) {
    this._id = crypto.randomUUID();
    this._name = name;
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

  snapshot(): ScheduleSnapshot {
    return {
      scheduleId: this._id,
      scheduleName: this._name.value(),
      days: this._days.map(d => d.value()),
      every: this._frequency.value(),
    };
  }

  private hasConflict(day: ScheduleDay) {
    return this._days.some(existing => existing.overlapsWith(day));
  }
}
