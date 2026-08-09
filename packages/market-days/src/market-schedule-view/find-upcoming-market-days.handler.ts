import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Clock, LocalDate } from '@market-miam/common';
import { FindUpcomingMarketDays } from './find-upcoming-market-days';
import { MarketDayOccurrence, UpcomingMarketDaysView } from './upcoming-market-days-view';
import { MarketScheduleView } from './market-schedule-view';
import { MarketScheduleViews } from './market-schedule-views';
import { MarketDayView } from '../market-day-view/market-day-view';
import { MarketDayViews } from '../market-day-view/market-day-views';
import { CatalogueViewItem } from '../catalogue-view/catalogue-view';
import { CatalogueViews } from '../catalogue-view/catalogue-views';
import { Recurrence } from '../calendar/schedule/recurrence';

type Dishes = Map<string, CatalogueViewItem[]>;

const dayKey = (marketId: string, date: string) => `${marketId}|${date}`;

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
    const dishes = await this.dishesByDay(query.vendorId, today, horizon);
    return { marketDays: this.marketDaysFrom(schedules, today, horizon, dishes) };
  }

  private marketDaysFrom(schedules: MarketScheduleView[], today: LocalDate, horizon: LocalDate, dishes: Dishes) {
    return schedules
      .flatMap(schedule => this.occurrencesOf(schedule, today, horizon, dishes))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private queryPeriod() {
    const today = this.clock.today();
    const horizon = today.plusDays(FindUpcomingMarketDaysHandler.HORIZON_DAYS);
    return { today, horizon };
  }

  // Absent days keep their occurrence but lose their menu — suppression lives in the
  // query, so no cross-aggregate coupling between calendar and market day.
  private occurrencesOf(schedule: MarketScheduleView, from: LocalDate, to: LocalDate, dishes: Dishes): MarketDayOccurrence[] {
    const absences = schedule.absences ?? [];
    const occurrences = Recurrence.fromSnapshot(schedule).occurrencesWithin(from, to);
    return occurrences.map(occurrence => {
      const absent = absences.some(range => range.from <= occurrence.date && occurrence.date <= range.to);
      return {
        scheduleId: schedule.scheduleId,
        marketId: schedule.marketId,
        date: occurrence.date,
        day: occurrence.day,
        startTime: occurrence.startTime,
        endTime: occurrence.endTime,
        absent,
        dishes: absent ? [] : dishes.get(dayKey(schedule.marketId, occurrence.date)) ?? [],
        market: schedule.market,
      };
    });
  }

  // Menus and catalogue are read once per query, not once per occurrence: the whole
  // window is one range scan. The menu event carries a set of ids; catalogue order is the
  // display order, and joining here means a revised name or price reaches days already planned.
  private async dishesByDay(vendorId: string, from: LocalDate, to: LocalDate): Promise<Dishes> {
    const [{ items }, menus] = await Promise.all([
      this.catalogues.forVendor(vendorId),
      this.menus.menusFor(vendorId, from.value(), to.value()),
    ]);
    return new Map(menus.map((menu: MarketDayView) => [
      dayKey(menu.marketId, menu.date),
      items.filter(item => menu.itemIds.includes(item.itemId)),
    ]));
  }
}
