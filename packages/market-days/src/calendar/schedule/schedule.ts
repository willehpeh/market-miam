import { ScheduleName } from './schedule-name';
import { ScheduleDay } from './schedule-day';
import { ScheduleFrequency } from './schedule-frequency';
import { ConflictingScheduleError, InvalidScheduleError } from '../errors';
import { ScheduleSnapshot } from './schedule-snapshot';
import { ScheduleId } from './schedule-id';

export class Schedule {
  private readonly _days: ScheduleDay[] = [];
  private _frequency = new ScheduleFrequency();

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
