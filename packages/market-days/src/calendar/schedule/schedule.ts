import { ScheduleDay } from './schedule-day';
import { ScheduleFrequency } from './schedule-frequency';
import { ScheduleId } from './schedule-id';
import { Recurrence, RecurrenceSnapshot } from './recurrence';
import { LocalDate } from '@market-miam/common';

type ScheduleSnapshot = RecurrenceSnapshot & {
  scheduleId: string;
};

type ScheduleParams = {
  id: ScheduleId;
  startDate: LocalDate;
  days: ScheduleDay[];
  frequency?: ScheduleFrequency;
};

export class Schedule {
  private readonly _id: ScheduleId;
  private readonly _recurrence: Recurrence;

  constructor(params: ScheduleParams) {
    this._id = params.id;
    this._recurrence = new Recurrence(params.startDate, params.days, params.frequency);
  }

  snapshot(): ScheduleSnapshot {
    return {
      scheduleId: this._id.value(),
      ...this._recurrence.snapshot()
    };
  }

  id(): ScheduleId {
    return this._id;
  }
}
