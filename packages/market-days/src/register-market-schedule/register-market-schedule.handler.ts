import { RegisterMarketSchedule } from './register-market-schedule';
import { Calendars } from '../calendar';
import { ScheduleName } from '../calendar/schedule-name';
import { ScheduleDay } from '../calendar/schedule-day';
import { ScheduleFrequency } from '../calendar/schedule-frequency';
import { Schedule } from '../calendar/schedule';
import { MarketId, VendorId } from '@market-monster/shared-kernel';

export class RegisterMarketScheduleHandler {
  constructor(private readonly calendars: Calendars) {
  }

  async handle(registerMarketSchedule: RegisterMarketSchedule): Promise<void> {
    const vendorId = new VendorId(registerMarketSchedule.vendorId);
    const marketId = new MarketId(registerMarketSchedule.marketId);
    const schedule = this.scheduleFrom(registerMarketSchedule);
    const calendar = await this.calendars.forVendor(vendorId);
    calendar.registerMarketSchedule(
      marketId,
      schedule
    );
    await this.calendars.save(calendar, vendorId);
  }

  private scheduleFrom(registerMarketSchedule: RegisterMarketSchedule) {
    const schedule = new Schedule(new ScheduleName(registerMarketSchedule.scheduleName));
    schedule.addDays(registerMarketSchedule.days.map(d => new ScheduleDay(d.day, d.startTime, d.endTime)));
    if (registerMarketSchedule.every) {
      schedule.repeatEvery(new ScheduleFrequency(registerMarketSchedule.every));
    }
    return schedule;
  }
}
