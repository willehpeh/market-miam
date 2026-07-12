import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CancelMarketSchedule } from './cancel-market-schedule';
import { Calendars } from '../calendar';
import { ScheduleId } from '../calendar/schedule/schedule-id';
import { VendorId } from '@market-miam/shared-kernel';

@CommandHandler(CancelMarketSchedule)
export class CancelMarketScheduleHandler implements ICommandHandler<CancelMarketSchedule> {
  constructor(private readonly calendars: Calendars) {
  }

  async execute(cancelMarketSchedule: CancelMarketSchedule): Promise<void> {
    const vendorId = new VendorId(cancelMarketSchedule.vendorId);
    const calendar = await this.calendars.forVendor(vendorId);
    calendar.cancelMarketSchedule(new ScheduleId(cancelMarketSchedule.scheduleId));
    await this.calendars.save(calendar, vendorId);
  }
}
