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
import { hasStarted, notYetEnded, parisWallClock } from './market-day-clock';

type DayMenu = { items: CatalogueViewItem[]; soldOutItemIds: string[] };
type Items = Map<string, DayMenu>;

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
    const items = await this.itemsByDay(query.vendorId, today, horizon);
    return { marketDays: this.marketDaysFrom(schedules, today, horizon, items) };
  }

  // Upcoming means still to come: a day that has ended leaves, so a vendor whose market
  // finished this afternoon is offered tomorrow rather than a day they can no longer sell on.
  // Days are dropped, not flagged — no past-day read path exists to list them with.
  private marketDaysFrom(schedules: MarketScheduleView[], today: LocalDate, horizon: LocalDate, items: Items) {
    const now = parisWallClock(this.clock.now());
    return schedules
      .flatMap(schedule => this.occurrencesOf(schedule, today, horizon, items))
      .filter(day => notYetEnded(day, now))
      .map(day => ({ ...day, inProgress: !day.absent && hasStarted(day, now) && notYetEnded(day, now) }))
      // First-by-start-time is what makes "the first occurrence" the market the vendor is
      // standing at; the fallback matches hasStarted, which treats no startTime as the
      // start of the day, and marketId makes the order total (decision 25).
      .sort((a, b) =>
        a.date.localeCompare(b.date)
        || (a.startTime ?? '00:00').localeCompare(b.startTime ?? '00:00')
        || a.marketId.localeCompare(b.marketId));
  }

  private queryPeriod() {
    const today = this.clock.today();
    const horizon = today.plusDays(FindUpcomingMarketDaysHandler.HORIZON_DAYS);
    return { today, horizon };
  }

  // Absent days keep their occurrence but lose their menu — suppression lives in the
  // query, so no cross-aggregate coupling between calendar and market day.
  private occurrencesOf(schedule: MarketScheduleView, from: LocalDate, to: LocalDate, items: Items): Omit<MarketDayOccurrence, 'inProgress'>[] {
    const absences = schedule.absences ?? [];
    const occurrences = Recurrence.fromSnapshot(schedule).occurrencesWithin(from, to);
    return occurrences.map(occurrence => {
      const absent = absences.some(range => range.from <= occurrence.date && occurrence.date <= range.to);
      const menu = absent ? undefined : items.get(dayKey(schedule.marketId, occurrence.date));
      return {
        scheduleId: schedule.scheduleId,
        marketId: schedule.marketId,
        date: occurrence.date,
        day: occurrence.day,
        startTime: occurrence.startTime,
        endTime: occurrence.endTime,
        absent,
        items: menu?.items ?? [],
        soldOutItemIds: menu?.soldOutItemIds ?? [],
        market: schedule.market,
      };
    });
  }

  // Menus and catalogue are read once per query, not once per occurrence: the whole
  // window is one range scan. The menu event carries a set of ids; catalogue order is the
  // display order, and joining here means a revised name or price reaches days already planned.
  private async itemsByDay(vendorId: string, from: LocalDate, to: LocalDate): Promise<Items> {
    const [{ items }, menus] = await Promise.all([
      this.catalogues.forVendor(vendorId),
      this.menus.menusFor(vendorId, from.value(), to.value()),
    ]);
    return new Map(menus.map((menu: MarketDayView) => [
      dayKey(menu.marketId, menu.date),
      { items: items.filter(item => menu.itemIds.includes(item.itemId)), soldOutItemIds: menu.soldOutItemIds },
    ]));
  }
}
