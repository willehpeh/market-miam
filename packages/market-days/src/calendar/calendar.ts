import { CalendarEvent } from './events';
import { MarketScheduleRegistered } from '../register-market-schedule';
import { Aggregate } from '@market-monster/event-sourcing';
import { Schedule } from './schedule';
import { MarketId } from './market-id';

export class Calendar extends Aggregate {
  apply(event: CalendarEvent): void {
    switch (event.type) {
      case 'MarketScheduleRegistered':
        console.log('To implement when necessary');
    }
  }

  registerMarketSchedule(marketId: MarketId, schedule: Schedule): void {
    const { scheduleId, scheduleName, days, every } = schedule.snapshot();
    const event: MarketScheduleRegistered = {
      type: 'MarketScheduleRegistered',
      payload: {
        marketId: marketId.value(),
        scheduleId,
        scheduleName,
        days,
        every,
      }
    };
    this.raise(event);
  }
}
