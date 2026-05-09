import { EventStore } from '@market-monster/event-sourcing';
import { RegisterMarketSchedule } from './register-market-schedule';
import { MarketScheduleRegistered } from './market-schedule-registered';

export class RegisterMarketScheduleHandler {
  constructor(private readonly store: EventStore) {
  }

  async handle(registerMarketSchedule: RegisterMarketSchedule): Promise<void> {
    const event: MarketScheduleRegistered = {
      type: 'MarketScheduleRegistered',
      payload: {
        scheduleName: registerMarketSchedule.scheduleName,
        marketId: registerMarketSchedule.marketId,
        directionsToStall: registerMarketSchedule.directionsToStall,
        days: registerMarketSchedule.days
      }
    };
    await this.store.append('', [{ event }], 0);
  }
}
