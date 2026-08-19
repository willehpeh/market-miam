import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Clock, LocalDate } from '@market-miam/common';
import { FindMarketDay } from './find-market-day';
import { MarketDayOccurrence } from './upcoming-market-days-view';
import { MarketScheduleView } from './market-schedule-view';
import { MarketScheduleViews } from './market-schedule-views';
import { MarketDayViews } from '../market-day-view/market-day-views';
import { CatalogueViews } from '../catalogue-view/catalogue-views';
import { Recurrence } from '../calendar/schedule/recurrence';
import { parisWallClock, standingOf } from './market-day-clock';

@QueryHandler(FindMarketDay)
export class FindMarketDayHandler implements IQueryHandler<FindMarketDay> {
  constructor(
    private readonly views: MarketScheduleViews,
    private readonly menus: MarketDayViews,
    private readonly catalogues: CatalogueViews,
    private readonly clock: Clock,
  ) {}

  async execute(query: FindMarketDay): Promise<MarketDayOccurrence | undefined> {
    const date = new LocalDate(query.date);
    const { schedules } = await this.views.forVendor(query.vendorId);
    // A vendor may hold several schedules at one market, so the date picks the schedule —
    // taking the first that names the market would answer for the wrong weekday.
    const covering = schedules
      .filter(schedule => schedule.marketId === query.marketId)
      .flatMap(schedule => Recurrence.fromSnapshot(schedule).occurrencesWithin(date, date)
        .map(occurrence => ({ schedule, occurrence })));
    if (covering.length === 0) {
      return undefined;
    }
    const { schedule: scheduled, occurrence } = covering[0];
    const now = parisWallClock(this.clock.now());
    const absent = this.isAbsent(scheduled, query.date);
    const [{ items }, [day]] = await Promise.all([
      this.catalogues.forVendor(query.vendorId),
      this.menus.menusFor(query.vendorId, query.date, query.date),
    ]);
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
      items: items.filter(item => menu?.itemIds.includes(item.itemId)),
      closed: day?.closed ?? false,
      soldOutItemIds: menu?.soldOutItemIds ?? [],
      market: scheduled.market,
    };
  }

  private isAbsent(schedule: MarketScheduleView, date: string): boolean {
    return (schedule.absences ?? []).some(range => range.from <= date && date <= range.to);
  }
}
