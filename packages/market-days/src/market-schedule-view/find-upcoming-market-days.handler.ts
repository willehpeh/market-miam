import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Clock, LocalDate } from '@market-miam/common';
import { FindUpcomingMarketDays } from './find-upcoming-market-days';
import { MarketDayOccurrence, UpcomingMarketDaysView } from './upcoming-market-days-view';
import { MarketScheduleView } from './market-schedule-view';
import { MarketScheduleViews } from './market-schedule-views';
import { MarketDayViews } from '../market-day-view/market-day-views';
import { CatalogueViews } from '../catalogue-view/catalogue-views';
import { MarketPricesViews } from '../market-prices-view/market-prices-views';
import { DayMenus, dayMenus, menuFor } from './day-menus';
import { scheduledDays } from './scheduled-days';
import { calledOff, notYetEnded, opensAt, parisWallClock, standingOf } from './market-day-clock';

@QueryHandler(FindUpcomingMarketDays)
export class FindUpcomingMarketDaysHandler implements IQueryHandler<FindUpcomingMarketDays> {
  private static readonly HORIZON_DAYS = 56;

  constructor(
    private readonly views: MarketScheduleViews,
    private readonly menus: MarketDayViews,
    private readonly catalogues: CatalogueViews,
    private readonly prices: MarketPricesViews,
    private readonly clock: Clock,
  ) {}

  async execute(query: FindUpcomingMarketDays): Promise<UpcomingMarketDaysView> {
    const { today, horizon } = this.queryPeriod();
    const { schedules } = await this.views.forVendor(query.vendorId);
    const items = await dayMenus(
      { catalogues: this.catalogues, menus: this.menus, prices: this.prices },
      query.vendorId,
      today.value(),
      horizon.value(),
    );
    return { marketDays: this.marketDaysFrom(schedules, today, horizon, items) };
  }

  // Upcoming means still to come: a day that has ended leaves, so a vendor whose market
  // finished this afternoon is offered tomorrow rather than a day they can no longer sell on.
  // Days are dropped, not flagged — no past-day read path exists to list them with.
  private marketDaysFrom(schedules: MarketScheduleView[], today: LocalDate, horizon: LocalDate, items: DayMenus) {
    const now = parisWallClock(this.clock.now());
    return schedules
      .flatMap(schedule => this.occurrencesOf(schedule, today, horizon, items))
      .filter(day => notYetEnded(day, now))
      // Ended days are gone by here (decision 57), so this list never carries `over` or
      // `past` — the point lookup is where those arrive.
      .map(day => ({ ...day, ...standingOf(day, now) }))
      // First-by-start-time is what makes "the first occurrence" the market the vendor is
      // standing at, and marketId makes the order total (decision 25).
      .sort((a, b) =>
        a.date.localeCompare(b.date)
        || opensAt(a).localeCompare(opensAt(b))
        || a.marketId.localeCompare(b.marketId));
  }

  private queryPeriod() {
    const today = this.clock.today();
    const horizon = today.plusDays(FindUpcomingMarketDaysHandler.HORIZON_DAYS);
    return { today, horizon };
  }

  // Absent days keep their occurrence but lose their menu.
  // The return type is unnamed on purpose: a day as the records alone describe it, missing
  // only the one field the clock answers (stamped per query in marketDaysFrom). The Omit is
  // not what binds the shape — execute's return type does that — it just fails here, at the
  // function that built the wrong day, rather than three calls up.
  private occurrencesOf(schedule: MarketScheduleView, from: LocalDate, to: LocalDate, items: DayMenus): Omit<MarketDayOccurrence, 'phase'>[] {
    return scheduledDays(schedule, from, to).map(({ absent, ...occurrence }) => {
      // Closure is the day's own state, not the menu's, so it survives the absence
      // suppression that hides items — a day can be both declared absent and closed.
      const day = menuFor(items, schedule.marketId, occurrence.date);
      const menu = absent ? undefined : day;
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
        outcomes: menu?.outcomes ?? {},
        closed: day?.closed ?? false,
        calledOff: calledOff(occurrence, day?.closedAt),
        market: schedule.market,
      };
    });
  }
}
