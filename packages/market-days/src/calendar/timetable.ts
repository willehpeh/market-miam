import { TimetableDay } from './timetable-day';
import { ConflictingScheduleError } from './conflicting-schedule.error';

export class Timetable {
  private readonly _days: TimetableDay[];

  constructor(days: TimetableDay[]) {
    for (let i = 0; i < days.length; i++) {
      for (let j = i + 1; j < days.length; j++) {
        if (days[i].overlapsWith(days[j])) {
          throw new ConflictingScheduleError();
        }
      }
    }
    this._days = days;
  }

  value(): { day: string; startTime?: string; endTime?: string }[] {
    return this._days.map(d => d.value());
  }
}
