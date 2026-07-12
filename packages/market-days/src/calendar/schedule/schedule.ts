import { ScheduleDay } from './schedule-day';
import { ScheduleFrequency } from './schedule-frequency';
import { InvalidScheduleError } from '../errors';
import { ScheduleId } from './schedule-id';
import { LocalDate } from '@market-miam/common';

type ScheduleSnapshot = {
  scheduleId: string;
  startDate: string;
  days: { day: string; startTime?: string; endTime?: string }[];
  frequency: { weeks: number } | 'once';
};

type ScheduleParams = {
  id: ScheduleId;
  startDate: LocalDate;
  days: ScheduleDay[];
  frequency?: ScheduleFrequency;
};

export class Schedule {
  private readonly _id: ScheduleId;
  private readonly _startDate: LocalDate;
  private readonly _days: ScheduleDay[] = [];
  private readonly _frequency: ScheduleFrequency;

  constructor(params: ScheduleParams) {
    this._id = params.id;
    this._startDate = params.startDate;
    this._frequency = params.frequency ?? new ScheduleFrequency();
    this.addDays(params.days);
  }

  snapshot(): ScheduleSnapshot {
    return {
      scheduleId: this._id.value(),
      startDate: this._startDate.value(),
      days: this._days.map(d => d.value()),
      frequency: this._frequency.value()
    };
  }

  private addDays(days: ScheduleDay[]): void {
    if (days.length === 0) {
      throw new InvalidScheduleError('Schedule must have at least one day');
    }
    this._days.push(...days);
  }
}
