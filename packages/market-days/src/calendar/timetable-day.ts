export class TimetableDay {
  private readonly _day: string;
  private readonly _startTime?: string;
  private readonly _endTime?: string;

  constructor(day: string, startTime?: string, endTime?: string) {
    this._day = day;
    this._startTime = startTime;
    this._endTime = endTime;
  }

  overlapsWith(other: TimetableDay): boolean {
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
      ...this._endTime ? { endTime: this._endTime } : {},
    };
  }
}
