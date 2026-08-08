import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Clock, LocalDate } from '@market-miam/common';
import { FindUpcomingMarketDays } from './find-upcoming-market-days';
import { MarketDayOccurrence, UpcomingMarketDaysView } from './upcoming-market-days-view';
import { MarketScheduleView } from './market-schedule-view';
import { MarketScheduleViews } from './market-schedule-views';
import { MarketDayViews } from '../market-day-view/market-day-views';
import { CatalogueViewItem } from '../catalogue-view/catalogue-view';
import { CatalogueViews } from '../catalogue-view/catalogue-views';
import { Recurrence } from '../calendar/schedule/recurrence';

type Occurrence = Omit<MarketDayOccurrence, 'dishes'>;

@QueryHandler(FindUpcomingMarketDays)
export class FindUpcomingMarketDaysHandler implements IQueryHandler<FindUpcomingMarketDays> {
  private static readonly HORIZON_DAYS = 56;

  constructor(
    private readonly views: MarketScheduleViews,
    private readonly menus: MarketDayViews,
    private readonly catalogues: CatalogueViews,
    private readonly clock: Clock,
  ) {}

  async execute(query: FindUpcomingMarketDays): Promise<UpcomingMarketDaysView> {
    const { today, horizon } = this.queryPeriod();
    const { schedules } = await this.views.forVendor(query.vendorId);
    const occurrences = this.marketDaysFrom(schedules, today, horizon);
    return { marketDays: await this.withMenus(query.vendorId, occurrences) };
  }

  private marketDaysFrom(schedules: MarketScheduleView[], today: LocalDate, horizon: LocalDate) {
    return schedules
      .flatMap(schedule => this.occurrencesOf(schedule, today, horizon))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private queryPeriod() {
    const today = this.clock.today();
    const horizon = today.plusDays(FindUpcomingMarketDaysHandler.HORIZON_DAYS);
    return { today, horizon };
  }

  private occurrencesOf(schedule: MarketScheduleView, from: LocalDate, to: LocalDate): Occurrence[] {
    const absences = schedule.absences ?? [];
    const occurrences = Recurrence.fromSnapshot(schedule).occurrencesWithin(from, to);
    return occurrences.map(occurrence => ({
      scheduleId: schedule.scheduleId,
      marketId: schedule.marketId,
      date: occurrence.date,
      day: occurrence.day,
      startTime: occurrence.startTime,
      endTime: occurrence.endTime,
      absent: absences.some(range => range.from <= occurrence.date && occurrence.date <= range.to),
      market: schedule.market,
    }));
  }

  // Absent days keep their occurrence but lose their menu — suppression lives in the
  // query, so no cross-aggregate coupling between calendar and market day.
  private async withMenus(vendorId: string, occurrences: Occurrence[]): Promise<MarketDayOccurrence[]> {
    const { items } = await this.catalogues.forVendor(vendorId);
    return Promise.all(occurrences.map(async occurrence => ({
      ...occurrence,
      dishes: occurrence.absent ? [] : await this.dishesFor(vendorId, occurrence, items),
    })));
  }

  // The menu event carries a set of ids; catalogue order is the display order, and
  // joining at query time means a revised name or price reaches days already planned.
  private async dishesFor(vendorId: string, occurrence: Occurrence, items: CatalogueViewItem[]): Promise<CatalogueViewItem[]> {
    const menu = await this.menus.menuFor(vendorId, occurrence.marketId, occurrence.date);
    return items.filter(item => menu.itemIds.includes(item.itemId));
  }
}
