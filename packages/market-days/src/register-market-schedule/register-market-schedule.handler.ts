import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RegisterMarketSchedule } from './register-market-schedule';
import { Calendars } from '../calendar';
import { ScheduleName } from '../calendar/schedule/schedule-name';
import { ScheduleDay } from '../calendar/schedule/schedule-day';
import { ScheduleFrequency } from '../calendar/schedule/schedule-frequency';
import { Schedule } from '../calendar/schedule/schedule';
import { MarketId, VendorId } from '@market-miam/shared-kernel';
import { ScheduleId } from '../calendar/schedule/schedule-id';
import { LocalDate } from '@market-miam/common';

@CommandHandler(RegisterMarketSchedule)
export class RegisterMarketScheduleHandler implements ICommandHandler<RegisterMarketSchedule> {
  constructor(private readonly calendars: Calendars) {
  }

  async execute(registerMarketSchedule: RegisterMarketSchedule): Promise<void> {
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
    return new Schedule({
      id: new ScheduleId(registerMarketSchedule.scheduleId),
      name: new ScheduleName(registerMarketSchedule.scheduleName),
      startDate: new LocalDate(registerMarketSchedule.startDate),
      days: registerMarketSchedule.days.map(d => new ScheduleDay(d.day, d.startTime, d.endTime)),
      frequency: registerMarketSchedule.frequency ? new ScheduleFrequency(registerMarketSchedule.frequency) : undefined,
    });
  }
}
