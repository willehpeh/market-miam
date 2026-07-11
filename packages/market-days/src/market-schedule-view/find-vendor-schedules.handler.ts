import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { FindVendorSchedules } from './find-vendor-schedules';
import { MarketSchedulesView } from './market-schedule-view';
import { MarketScheduleViews } from './market-schedule-views';

@QueryHandler(FindVendorSchedules)
export class FindVendorSchedulesHandler implements IQueryHandler<FindVendorSchedules> {
  constructor(private readonly views: MarketScheduleViews) {}

  execute(query: FindVendorSchedules): Promise<MarketSchedulesView> {
    return this.views.forVendor(query.vendorId);
  }
}
