import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Clock, LocalDate } from '@market-miam/common';
import { FindMarketDay } from './find-market-day';
import { MarketDayOccurrence } from './upcoming-market-days-view';
import { MarketScheduleViews } from './market-schedule-views';
import { MarketDayViews } from '../market-day-view/market-day-views';
import { CatalogueViews } from '../catalogue-view/catalogue-views';
import { MarketPricesViews } from '../market-prices-view/market-prices-views';
import { dayMenus, menuFor } from './day-menus';
import { scheduledDays } from './scheduled-days';
import { calledOff, parisWallClock, standingOf } from './market-day-clock';

@QueryHandler(FindMarketDay)
export class FindMarketDayHandler implements IQueryHandler<FindMarketDay> {
  constructor(
    private readonly views: MarketScheduleViews,
    private readonly menus: MarketDayViews,
    private readonly catalogues: CatalogueViews,
    private readonly prices: MarketPricesViews,
    private readonly clock: Clock,
  ) {}

  async execute(query: FindMarketDay): Promise<MarketDayOccurrence | undefined> {
    const date = new LocalDate(query.date);
    const { schedules } = await this.views.forVendor(query.vendorId);
    // A vendor may hold several schedules at one market, so the date picks the schedule —
    // taking the first that names the market would answer for the wrong weekday.
    const covering = schedules
      .filter(schedule => schedule.marketId === query.marketId)
      .flatMap(schedule => scheduledDays(schedule, date, date).map(occurrence => ({ schedule, occurrence })));
    if (covering.length === 0) {
      return undefined;
    }
    const { schedule: scheduled, occurrence } = covering[0];
    const now = parisWallClock(this.clock.now());
    const { absent } = occurrence;
    const day = menuFor(
      await dayMenus({ catalogues: this.catalogues, menus: this.menus, prices: this.prices }, query.vendorId, query.date, query.date),
      scheduled.marketId,
      query.date,
    );
    const menu = absent ? undefined : day;
    return {
      scheduleId: scheduled.scheduleId,
      marketId: scheduled.marketId,
      date: occurrence.date,
      day: occurrence.day,
      startTime: occurrence.startTime,
      endTime: occurrence.endTime,
      absent,
      ...standingOf(occurrence, now),
      items: menu?.items ?? [],
      closed: day?.closed ?? false,
      calledOff: calledOff(occurrence, day?.closedAt),
      soldOutItemIds: menu?.soldOutItemIds ?? [],
      outcomes: menu?.outcomes ?? {},
      market: scheduled.market,
    };
  }
}
