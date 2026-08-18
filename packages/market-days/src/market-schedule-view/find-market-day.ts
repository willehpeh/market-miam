import { Query } from '@nestjs/cqrs';
import { MarketDayOccurrence } from './upcoming-market-days-view';

// A point lookup, deliberately unbounded in time: the live screen reads the day it is
// showing, and a closed day stays the vendor's to look at long after the upcoming window
// has moved past it.
export class FindMarketDay extends Query<MarketDayOccurrence | undefined> {
  constructor(
    public readonly vendorId: string,
    public readonly marketId: string,
    public readonly date: string,
  ) {
    super();
  }
}
