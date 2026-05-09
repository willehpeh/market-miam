import { RegisterMarketSchedule } from './register-market-schedule';
import { Calendars } from '../calendar';

export class RegisterMarketScheduleHandler {
  constructor(private readonly calendars: Calendars) {
  }

  async handle(registerMarketSchedule: RegisterMarketSchedule): Promise<void> {
    const calendar = await this.calendars.forVendor(registerMarketSchedule.vendorId);
    calendar.registerMarketSchedule(
      registerMarketSchedule.scheduleName,
      registerMarketSchedule.marketId,
      registerMarketSchedule.directionsToStall ?? '',
      registerMarketSchedule.days
    );
    await this.calendars.save(calendar, registerMarketSchedule.vendorId);
  }
}
