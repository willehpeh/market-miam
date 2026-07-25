import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Clock, LocalDate } from '@market-miam/common';
import { FindUpcomingMarketDays } from './find-upcoming-market-days';
import { MarketDayOccurrence, UpcomingMarketDaysView } from './upcoming-market-days-view';
import { MarketScheduleView } from './market-schedule-view';
import { MarketScheduleViews } from './market-schedule-views';
import { Recurrence } from '../calendar/schedule/recurrence';

@QueryHandler(FindUpcomingMarketDays)
export class FindUpcomingMarketDaysHandler implements IQueryHandler<FindUpcomingMarketDays> {
  private static readonly HORIZON_DAYS = 56;

  constructor(private readonly views: MarketScheduleViews, private readonly clock: Clock) {}

  async execute(query: FindUpcomingMarketDays): Promise<UpcomingMarketDaysView> {
    const { today, horizon } = this.queryPeriod();
    const { schedules } = await this.views.forVendor(query.vendorId);
    return { marketDays: this.marketDaysFrom(schedules, today, horizon) };
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

  private occurrencesOf(schedule: MarketScheduleView, from: LocalDate, to: LocalDate): MarketDayOccurrence[] {
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
}
