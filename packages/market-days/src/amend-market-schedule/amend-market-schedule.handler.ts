import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AmendMarketSchedule } from './amend-market-schedule';
import { Calendars } from '../calendar';
import { ScheduleDay } from '../calendar/schedule/schedule-day';
import { ScheduleFrequency } from '../calendar/schedule/schedule-frequency';
import { Schedule } from '../calendar/schedule/schedule';
import { MarketId, VendorId } from '@market-miam/shared-kernel';
import { ScheduleId } from '../calendar/schedule/schedule-id';
import { LocalDate } from '@market-miam/common';
import { Market, MarketName, StreetAddress, PostalCode, Town, Pitch } from '../market';

@CommandHandler(AmendMarketSchedule)
export class AmendMarketScheduleHandler implements ICommandHandler<AmendMarketSchedule> {
  constructor(private readonly calendars: Calendars) {
  }

  async execute(amendMarketSchedule: AmendMarketSchedule): Promise<void> {
    const vendorId = new VendorId(amendMarketSchedule.vendorId);
    const market = this.marketFrom(amendMarketSchedule);
    const schedule = this.scheduleFrom(amendMarketSchedule);
    const calendar = await this.calendars.forVendor(vendorId);
    calendar.amendMarketSchedule(market, schedule);
    await this.calendars.save(calendar, vendorId);
  }

  private marketFrom(amendMarketSchedule: AmendMarketSchedule) {
    const { id, name, streetAddress, codePostal, town, pitch } = amendMarketSchedule.market;
    return new Market({
      id: new MarketId(id),
      name: new MarketName(name),
      streetAddress: streetAddress ? new StreetAddress(streetAddress) : undefined,
      postalCode: new PostalCode(codePostal),
      town: new Town(town),
      pitch: pitch ? new Pitch(pitch) : undefined,
    });
  }

  private scheduleFrom(amendMarketSchedule: AmendMarketSchedule) {
    return new Schedule({
      id: new ScheduleId(amendMarketSchedule.scheduleId),
      startDate: new LocalDate(amendMarketSchedule.startDate),
      days: amendMarketSchedule.days.map(d => new ScheduleDay(d.day, d.startTime, d.endTime)),
      frequency: amendMarketSchedule.frequency ? new ScheduleFrequency(amendMarketSchedule.frequency) : undefined,
    });
  }
}
