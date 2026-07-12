import { Query } from '@nestjs/cqrs';
import { MarketSchedulesView } from './market-schedule-view';

export class FindVendorSchedules extends Query<MarketSchedulesView> {
  constructor(public readonly vendorId: string) {
    super();
  }
}
