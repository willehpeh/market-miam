import { InvalidScheduleError } from '../errors/';
import { TimeRange } from './time-range';

export class ScheduleDay {
  private readonly _day: string;
  private readonly _startTime?: string;
  private readonly _window?: TimeRange;

  constructor(day: string, startTime?: string, endTime?: string) {
    if (this.isValidDay(day)) {
      throw new InvalidScheduleError(`Invalid day: ${ day }`);
    }
    if (endTime && !startTime) {
      throw new InvalidScheduleError(`Start time is required when an end time is given for day ${ day }`);
    }
    this._day = day;
    this._startTime = startTime;
    this._window = startTime && endTime ? new TimeRange(startTime, endTime) : undefined;
  }

  private isValidDay(day: string) {
    return !['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].includes(day);
  }

  value(): { day: string; startTime?: string; endTime?: string } {
    if (this._window) {
      return { day: this._day, ...this._window.value() };
    }
    if (this._startTime) {
      return { day: this._day, startTime: this._startTime };
    }
    return { day: this._day };
  }
}
