import { MarketScheduleRegistered } from './events';
import { Aggregate } from '@market-miam/event-sourcing';
import { Schedule } from './schedule/schedule';
import { Market } from '../market';

export class Calendar extends Aggregate {

  apply(): void {
    // no-op for now
  }

  registerMarketSchedule(market: Market, schedule: Schedule): void {
    const { scheduleId, scheduleName, days, frequency, startDate } = schedule.snapshot();
    const event: MarketScheduleRegistered = {
      type: 'MarketScheduleRegistered',
      payload: {
        market: market.snapshot(),
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
