import { Query } from '@nestjs/cqrs';
import { LiveMarketDay } from './live-market-day';

export class FindLiveMarketDay extends Query<LiveMarketDay> {
  constructor(
    public readonly vendorId: string,
    public readonly marketId: string,
    public readonly date: string,
  ) {
    super();
  }
}
