import { CalendarEvent } from './events';
import { MarketScheduleRegistered } from '../register-market-schedule';
import { Aggregate } from '@market-monster/event-sourcing';

export class Calendar extends Aggregate {
  apply(event: CalendarEvent): void {
    switch (event.type) {
      case 'MarketScheduleRegistered':
        console.log('To implement when necessary');
    }
  }

  registerMarketSchedule(scheduleName: string,
                         marketId: string,
                         directionsToStall: string,
                         days: { day: string, startTime?: string, endTime?: string }[],
                         every = { weeks: 1 }): void {
    const event: MarketScheduleRegistered = {
      type: 'MarketScheduleRegistered',
      payload: {
        scheduleName,
        marketId,
        directionsToStall,
        days,
        every
      }
    };
    this.raise(event);
  }
}
