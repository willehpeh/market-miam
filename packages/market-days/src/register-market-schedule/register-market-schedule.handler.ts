import { RegisterMarketSchedule } from './register-market-schedule';
import { Calendars } from '../calendar';
import { ScheduleName } from '../calendar/schedule-name';
import { TimetableDay } from '../calendar/timetable-day';
import { Timetable } from '../calendar/timetable';

export class RegisterMarketScheduleHandler {
  constructor(private readonly calendars: Calendars) {
  }

  async handle(registerMarketSchedule: RegisterMarketSchedule): Promise<void> {
    const scheduleName = new ScheduleName(registerMarketSchedule.scheduleName);
    const timetable = new Timetable(registerMarketSchedule.days.map(d => new TimetableDay(d.day, d.startTime, d.endTime)));
    const calendar = await this.calendars.forVendor(registerMarketSchedule.vendorId);
    calendar.registerMarketSchedule(
      scheduleName,
      registerMarketSchedule.marketId,
      registerMarketSchedule.directionsToStall ?? '',
      timetable
    );
    await this.calendars.save(calendar, registerMarketSchedule.vendorId);
  }
}
