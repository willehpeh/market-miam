import { CalendarEvent, MarketScheduleRegistered } from './events';
import { Aggregate } from '@market-monster/event-sourcing';
import { Schedule } from './schedule/schedule';
import { MarketId } from '@market-monster/shared-kernel';
import { ConflictingScheduleError } from './errors';

export class Calendar extends Aggregate {

  private readonly _schedules: Schedule[] = [];

  apply(event: CalendarEvent): void {
    switch (event.type) {
      case 'MarketScheduleRegistered': {
        this._schedules.push(Schedule.fromSnapshot(event.payload));
        break;
      }
    }
  }

  registerMarketSchedule(marketId: MarketId, schedule: Schedule): void {
    if (this._schedules.some(existing => existing.conflictsWith(schedule))) {
      throw new ConflictingScheduleError();
    }
    const { scheduleId, scheduleName, days, every, startDate } = schedule.snapshot();
    const event: MarketScheduleRegistered = {
      type: 'MarketScheduleRegistered',
      payload: {
        marketId: marketId.value(),
        scheduleId,
        scheduleName,
        startDate,
        days,
        every
      }
    };
    this.raise(event);
  }
}
