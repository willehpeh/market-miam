import { InvalidScheduleError } from '../errors/';

export class TimeRange {
  constructor(
    private readonly start: string,
    private readonly end: string
  ) {
    if (this.startIsAfterEnd(start, end)) {
      throw new InvalidScheduleError('End time must be after start time');
    }
  }

  value(): { startTime: string; endTime: string } {
    return { startTime: this.start, endTime: this.end };
  }

  private startIsAfterEnd(start: string, end: string): boolean {
    return end <= start;
  }
}
