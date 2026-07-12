import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Clock, LocalDate } from '@market-miam/common';
import { FindUpcomingMarketDays } from './find-upcoming-market-days';
import { MarketDayOccurrence, UpcomingMarketDaysView } from './upcoming-market-days-view';
import { MarketScheduleView } from './market-schedule-view';
import { MarketScheduleViews } from './market-schedule-views';
import { Schedule } from '../calendar/schedule/schedule';

@QueryHandler(FindUpcomingMarketDays)
export class FindUpcomingMarketDaysHandler implements IQueryHandler<FindUpcomingMarketDays> {
  private static readonly HORIZON_DAYS = 56;

  constructor(private readonly views: MarketScheduleViews, private readonly clock: Clock) {}

  async execute(query: FindUpcomingMarketDays): Promise<UpcomingMarketDaysView> {
    const today = this.clock.today();
    const horizon = today.plusDays(FindUpcomingMarketDaysHandler.HORIZON_DAYS);
    const { schedules } = await this.views.forVendor(query.vendorId);
    const marketDays = schedules
      .flatMap(schedule => this.occurrencesOf(schedule, today, horizon))
      .sort((a, b) => a.date.localeCompare(b.date));
    return { marketDays };
  }

  private occurrencesOf(schedule: MarketScheduleView, from: LocalDate, to: LocalDate): MarketDayOccurrence[] {
    return Schedule.fromSnapshot(schedule).occurrencesWithin(from, to).map(occurrence => ({
      scheduleId: occurrence.scheduleId,
      marketId: schedule.market.id,
      date: occurrence.date,
      day: occurrence.day,
      startTime: occurrence.startTime,
      endTime: occurrence.endTime,
      absent: false,
      market: {
        name: schedule.market.name,
        town: schedule.market.town,
        codePostal: schedule.market.codePostal,
        streetAddress: schedule.market.streetAddress,
        pitch: schedule.market.pitch,
      },
    }));
  }
}
