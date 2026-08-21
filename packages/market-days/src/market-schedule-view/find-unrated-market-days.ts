import { Query } from '@nestjs/cqrs';
import { UnratedMarketDaysView } from './unrated-market-days-view';

// The one backward-looking read in the app. The upcoming list drops a day at endTime
// (decision 57), so a market that finished this afternoon is in nothing the vendor's app
// reads — and an unjudged one would simply be forgotten.
export class FindUnratedMarketDays extends Query<UnratedMarketDaysView> {
  constructor(public readonly vendorId: string) {
    super();
  }
}
