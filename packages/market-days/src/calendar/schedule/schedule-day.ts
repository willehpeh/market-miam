import { InvalidScheduleError } from '../errors/';

export class ScheduleDay {
  private readonly _day: string;
  private readonly _startTime?: string;
  private readonly _endTime?: string;

  constructor(day: string, startTime?: string, endTime?: string) {
    if (this.isValidDay(day)) {
      throw new InvalidScheduleError(`Invalid day: ${ day }`);
    }
    if (endTime && !startTime) {
      throw new InvalidScheduleError(`Start time is required when an end time is given for day ${ day }`);
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
    if (this.isStartOnly() && other.hasStartTime()) {
      return false;
    }
    if (other.isStartOnly() && this.hasStartTime()) {
      return false;
    }
    if (!this._startTime || !this._endTime || !other._startTime || !other._endTime) {
      return true;
    }
    return this._startTime < other._endTime && other._startTime < this._endTime;
  }

  private isStartOnly(): boolean {
    return Boolean(this._startTime) && !this._endTime;
  }

  private hasStartTime(): boolean {
    return Boolean(this._startTime);
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
