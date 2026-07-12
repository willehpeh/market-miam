import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeclareAbsence } from './declare-absence';
import { Calendars } from '../calendar';
import { ScheduleId } from '../calendar/schedule/schedule-id';
import { DateRange } from '../calendar/date-range';
import { VendorId } from '@market-miam/shared-kernel';
import { LocalDate } from '@market-miam/common';

@CommandHandler(DeclareAbsence)
export class DeclareAbsenceHandler implements ICommandHandler<DeclareAbsence> {
  constructor(private readonly calendars: Calendars) {
  }

  async execute(declareAbsence: DeclareAbsence): Promise<void> {
    const vendorId = new VendorId(declareAbsence.vendorId);
    const calendar = await this.calendars.forVendor(vendorId);
    calendar.declareAbsence(
      new ScheduleId(declareAbsence.scheduleId),
      new DateRange(new LocalDate(declareAbsence.from), new LocalDate(declareAbsence.to))
    );
    await this.calendars.save(calendar, vendorId);
  }
}
