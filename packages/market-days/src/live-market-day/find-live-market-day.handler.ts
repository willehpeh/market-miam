import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { StoredEvent } from '@market-miam/event-sourcing';
import { Clock, LocalDate } from '@market-miam/common';
import { MarketId, VendorId, VendorScopedEvents } from '@market-miam/shared-kernel';
import { MarketDayEvent, MarketDayId } from '../market-day';
import { MarketScheduleViews } from '../market-schedule-view/market-schedule-views';
import { CatalogueViews } from '../catalogue-view/catalogue-views';
import { MarketPricesViews } from '../market-prices-view/market-prices-views';
import { priced } from '../market-prices-view/priced-items';
import { ScheduledDay, scheduledDayAt } from '../market-schedule-view/scheduled-days';
import { parisWallClock, standingOf } from '../market-schedule-view/market-day-clock';
import { FindLiveMarketDay } from './find-live-market-day';
import { LiveMarketDay } from './live-market-day';
import { Stand } from './stand';

@QueryHandler(FindLiveMarketDay)
export class FindLiveMarketDayHandler implements IQueryHandler<FindLiveMarketDay> {
  constructor(
    private readonly vendorEvents: VendorScopedEvents,
    private readonly schedules: MarketScheduleViews,
    private readonly catalogues: CatalogueViews,
    private readonly prices: MarketPricesViews,
    private readonly clock: Clock,
  ) {}

  async execute({ vendorId, marketId, date }: FindLiveMarketDay): Promise<LiveMarketDay | undefined> {
    const day = new LocalDate(date);
    const id = new MarketDayId(new MarketId(marketId), day);
    const [events, scheduled, { items }, marketPrices] = await Promise.all([
      this.vendorEvents.load(id.streamIdFor(new VendorId(vendorId))) as Promise<StoredEvent<MarketDayEvent>[]>,
      this.scheduledDay(vendorId, marketId, day),
      this.catalogues.forVendor(vendorId),
      this.prices.forVendor(vendorId),
    ]);
    if (!scheduled) {
      return undefined;
    }
    const { phase } = standingOf(scheduled, parisWallClock(this.clock.now()));
    const stand = new Stand();
    events.forEach(event => stand.apply(event));
    const pricesAtMarket = marketPrices.find(market => market.marketId === marketId)?.prices ?? {};
    return stand.answer(phase, priced(items, pricesAtMarket));
  }

  private async scheduledDay(vendorId: string, marketId: string, date: LocalDate): Promise<ScheduledDay | undefined> {
    const { schedules } = await this.schedules.forVendor(vendorId);
    return scheduledDayAt(schedules, marketId, date)?.occurrence;
  }
}
