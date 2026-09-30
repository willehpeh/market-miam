import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Clock, LocalDate, LocalDateTime } from '@market-miam/common';
import { FindUnratedMarketDays } from './find-unrated-market-days';
import { UnratedMarketDaysView } from './unrated-market-days-view';
import { MarketScheduleView } from './market-schedule-view';
import { MarketScheduleViews } from './market-schedule-views';
import { MarketDayView } from '../market-day-view/market-day-view';
import { MarketDayViews } from '../market-day-view/market-day-views';
import { CatalogueViews } from '../catalogue-view/catalogue-views';
import { scheduledDays } from './scheduled-days';
import { calledOff, parisWallClock, standingOf } from './market-day-clock';

// The occurrence as the schedule describes it, before it is narrowed to what the prompt
// renders: the hours are what the clock needs to say whether the market is finished.
type Occurrence = {
  marketId: string;
  date: string;
  day: string;
  marketName: string;
  startTime?: string;
  endTime?: string;
};

const dayKey = (marketId: string, date: string) => `${marketId}|${date}`;

@QueryHandler(FindUnratedMarketDays)
export class FindUnratedMarketDaysHandler implements IQueryHandler<FindUnratedMarketDays> {
  // A nudge, not a backlog: one week clears a weekly market with room spare, where an
  // unbounded window turns the prompt into a list and drifts into the cross-month
  // retrospective this slice defers. The number lives here rather than in the aggregate
  // (decision 69) — it is a UX rule the pilot is expected to move, and moving it must not
  // retroactively change which past commands were legal.
  private static readonly WINDOW_DAYS = 7;

  constructor(
    private readonly views: MarketScheduleViews,
    private readonly menus: MarketDayViews,
    private readonly catalogues: CatalogueViews,
    private readonly clock: Clock,
  ) {}

  async execute(query: FindUnratedMarketDays): Promise<UnratedMarketDaysView> {
    const today = this.clock.today();
    const from = today.plusDays(-FindUnratedMarketDaysHandler.WINDOW_DAYS);
    const [{ schedules }, menus, { items }] = await Promise.all([
      this.views.forVendor(query.vendorId),
      this.menus.menusFor(query.vendorId, from.value(), today.value()),
      this.catalogues.forVendor(query.vendorId),
    ]);
    const inCatalogue = new Set(items.map(item => item.itemId));
    const byDay = new Map(menus.map(menu => [dayKey(menu.marketId, menu.date), menu]));
    const now = parisWallClock(this.clock.now());
    return {
      marketDays: schedules
        .flatMap(schedule => this.occurrencesOf(schedule, from, today))
        .filter(occurrence => this.isUnrated(occurrence, byDay.get(dayKey(occurrence.marketId, occurrence.date)), inCatalogue, now))
        // Oldest first: the day about to fall out of the window is the one to clear.
        .sort((a, b) => a.date.localeCompare(b.date) || a.marketId.localeCompare(b.marketId))
        .map(({ marketId, date, day, marketName }) => ({ marketId, date, day, marketName })),
    };
  }

  private occurrencesOf(schedule: MarketScheduleView, from: LocalDate, to: LocalDate): Occurrence[] {
    return scheduledDays(schedule, from, to)
      // A declared absence suppresses the menu, so a day inside one has nothing to judge.
      .filter(occurrence => !occurrence.absent)
      .map(occurrence => ({
        marketId: schedule.marketId,
        date: occurrence.date,
        day: occurrence.day,
        marketName: schedule.market.name,
        startTime: occurrence.startTime,
        endTime: occurrence.endTime,
      }));
  }

  // Three conditions, one predicate, because none of them stands alone: the market must be
  // finished, it must have carried a menu, and something on that menu must still be
  // unjudged.
  private isUnrated(occurrence: Occurrence, menu: MarketDayView | undefined, inCatalogue: ReadonlySet<string>, now: LocalDateTime): boolean {
    if (!this.isFinished(occurrence, menu, now)) {
      return false;
    }
    // Read against the catalogue join rather than the stored ids: a retired dish has no row
    // on the bilan to clear, so a day carrying one would nag for ever.
    const planned = (menu?.itemIds ?? []).filter(itemId => inCatalogue.has(itemId));
    // Partial counts as unrated (decision 65): a vendor who answered three of five has an
    // incomplete bilan, and the prompt is the only thing that will tell them.
    return planned.length > 0 && planned.some(itemId => !menu?.outcomes[itemId]);
  }

  // The domain's own predicate (decision 69), off the same clock the commands use — closed,
  // ended, or simply past, and never a day called off before it opened (decision 75). The
  // prompt never offers a bilan the aggregate would refuse.
  private isFinished(occurrence: Occurrence, menu: MarketDayView | undefined, now: LocalDateTime): boolean {
    if (calledOff(occurrence, menu?.closedAt)) {
      return false;
    }
    const { phase } = standingOf(occurrence, now);
    return menu?.closed === true || phase === 'over' || phase === 'past';
  }
}
