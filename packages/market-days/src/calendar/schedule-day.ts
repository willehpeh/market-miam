import { InvalidScheduleError } from './invalid-schedule.error';

export class ScheduleDay {
  private readonly _day: string;
  private readonly _startTime?: string;
  private readonly _endTime?: string;

  constructor(day: string, startTime?: string, endTime?: string) {
    if (this.isValidDay(day)) {
      throw new InvalidScheduleError(`Invalid day: ${ day }`);
    }
    if (startTime && endTime && !this.endIsAfterStart(startTime, endTime)) {
      throw new InvalidScheduleError(`End time must be after start time for day ${ day }`);
    }
    this._day = day;
    this._startTime = startTime;
    this._endTime = endTime;
  }

  private isValidDay(day: string) {
    return !['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].includes(day);
  }

  overlapsWith(other: ScheduleDay): boolean {
    if (this._day !== other._day) {
      return false;
    }
    if (!this._startTime || !this._endTime || !other._startTime || !other._endTime) {
      return true;
    }
    return this._startTime < other._endTime && other._startTime < this._endTime;
  }

  value(): { day: string; startTime?: string; endTime?: string } {
    return {
      day: this._day,
      ...this._startTime ? { startTime: this._startTime } : {},
      ...this._endTime ? { endTime: this._endTime } : {}
    };
  }

  private endIsAfterStart(startTime: string, endTime: string): boolean {
    return startTime < endTime;
  }
}
