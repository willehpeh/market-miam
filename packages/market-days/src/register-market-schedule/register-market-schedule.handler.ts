import { Aggregate, EventStore } from '@market-monster/event-sourcing';
import { RegisterMarketSchedule } from './register-market-schedule';
import { MarketScheduleRegistered } from './market-schedule-registered';

type CalendarEvent = MarketScheduleRegistered;

class Calendar extends Aggregate {
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

export class RegisterMarketScheduleHandler {
  constructor(private readonly store: EventStore) {
  }

  async handle(registerMarketSchedule: RegisterMarketSchedule): Promise<void> {
    const calendar = new Calendar();
    calendar.registerMarketSchedule(
      registerMarketSchedule.scheduleName,
      registerMarketSchedule.marketId,
      registerMarketSchedule.directionsToStall ?? '',
      registerMarketSchedule.days
    );
    await this.store.append('', calendar.raisedEvents().map(event => ({ event })), 0);
  }
}
