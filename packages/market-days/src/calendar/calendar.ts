import { MarketScheduleRegistered } from './events';
import { Aggregate } from '@market-miam/event-sourcing';
import { Schedule } from './schedule/schedule';
import { MarketId } from '@market-miam/shared-kernel';

export class Calendar extends Aggregate {

  apply(): void {
    // no-op for now
  }

  registerMarketSchedule(marketId: MarketId, schedule: Schedule): void {
    const { scheduleId, scheduleName, days, frequency, startDate } = schedule.snapshot();
    const event: MarketScheduleRegistered = {
      type: 'MarketScheduleRegistered',
      payload: {
        marketId: marketId.value(),
        scheduleId,
        scheduleName,
        startDate,
        days,
        frequency
      },
      version: 1
    };
    this.raise(event);
  }
}
