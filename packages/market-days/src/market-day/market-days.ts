import { VendorId } from '@market-miam/shared-kernel';
import { Clock, LocalDate } from '@market-miam/common';
import { MarketDay } from './market-day';
import { MarketHours } from './market-hours';
import { MarketDayId } from './market-day-id';
import { VendorScopedEvents } from '../vendor-scoped-events';
import { Calendars } from '../calendar';

export class MarketDays {
  constructor(private readonly vendorEvents: VendorScopedEvents,
              private readonly clock: Clock,
              private readonly calendars: Calendars) {
  }

  // The day is constituted with everything it decides on — today, and the hours its market
  // runs to — rather than being handed them per command. Both streams are read at once, so
  // the calendar costs a round trip rather than a second one.
  async forVendorAtMarketOn(vendorId: VendorId, id: MarketDayId): Promise<MarketDay> {
    const [events, calendar] = await Promise.all([
      this.vendorEvents.load(id.streamIdFor(vendorId)),
      this.calendars.forVendor(vendorId),
    ]);
    const { marketId, date } = id.snapshot();
    const hours = calendar.hoursFor(marketId, new LocalDate(date));
    return new MarketDay(id, this.clock.today(), new MarketHours(hours?.startTime, hours?.endTime))
      .rehydrate(events);
  }

  save(marketDay: MarketDay, vendorId: VendorId): Promise<void> {
    return this.vendorEvents.save(marketDay.streamIdFor(vendorId), marketDay, vendorId);
  }
}
