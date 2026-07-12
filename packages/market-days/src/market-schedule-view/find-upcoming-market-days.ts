import { Query } from '@nestjs/cqrs';
import { UpcomingMarketDaysView } from './upcoming-market-days-view';

export class FindUpcomingMarketDays extends Query<UpcomingMarketDaysView> {
  constructor(public readonly vendorId: string) {
    super();
  }
}
