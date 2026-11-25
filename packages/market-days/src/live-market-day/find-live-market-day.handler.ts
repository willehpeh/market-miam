import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { StoredEvent } from '@market-miam/event-sourcing';
import { Clock, LocalDate } from '@market-miam/common';
import { MarketId, VendorId, VendorScopedEvents } from '@market-miam/shared-kernel';
import { MarketDayEvent, MarketDayId } from '../market-day';
import { MarketScheduleViews } from '../market-schedule-view/market-schedule-views';
import { ScheduledDay, scheduledDayAt } from '../market-schedule-view/scheduled-days';
import { parisWallClock, standingOf } from '../market-schedule-view/market-day-clock';
import { FindLiveMarketDay } from './find-live-market-day';
import { LiveMarketDay } from './live-market-day';
import { MarketDayOnRecord } from './market-day-on-record';

@QueryHandler(FindLiveMarketDay)
export class FindLiveMarketDayHandler implements IQueryHandler<FindLiveMarketDay> {
  constructor(
    private readonly vendorEvents: VendorScopedEvents,
    private readonly schedules: MarketScheduleViews,
    private readonly clock: Clock,
  ) {}

  async execute({ vendorId, marketId, date }: FindLiveMarketDay): Promise<LiveMarketDay> {
    const id = new MarketDayId(new MarketId(marketId), new LocalDate(date));
    const [events, scheduled] = await Promise.all([
      this.vendorEvents.load(id.streamIdFor(new VendorId(vendorId))) as Promise<StoredEvent<MarketDayEvent>[]>,
      this.scheduledDay(vendorId, marketId, new LocalDate(date)),
    ]);
    const { phase } = standingOf(scheduled, parisWallClock(this.clock.now()));
    return events.reduce((day, event) => day.with(event), new MarketDayOnRecord()).answer(phase);
  }

  private async scheduledDay(vendorId: string, marketId: string, date: LocalDate): Promise<ScheduledDay> {
    const { schedules } = await this.schedules.forVendor(vendorId);
    const scheduled = scheduledDayAt(schedules, marketId, date);
    if (!scheduled) {
      throw new Error(`No schedule puts vendor ${vendorId} at market ${marketId} on ${date.value()}`);
    }
    return scheduled.occurrence;
  }
}
