import { CalendarEvent } from './events';
import { MarketScheduleRegistered } from '../register-market-schedule';
import { Aggregate } from '@market-monster/event-sourcing';
import { ScheduleName } from './schedule-name';
import { Timetable } from './timetable';

export class Calendar extends Aggregate {
  apply(event: CalendarEvent): void {
    switch (event.type) {
      case 'MarketScheduleRegistered':
        console.log('To implement when necessary');
    }
  }

  registerMarketSchedule(scheduleName: ScheduleName,
                         marketId: string,
                         directionsToStall: string,
                         timetable: Timetable,
                         every = { weeks: 1 }): void {
    const event: MarketScheduleRegistered = {
      type: 'MarketScheduleRegistered',
      payload: {
        scheduleName: scheduleName.value(),
        marketId,
        directionsToStall,
        days: timetable.value(),
        every
      }
    };
    this.raise(event);
  }
}
