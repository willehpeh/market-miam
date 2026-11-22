import { longDate } from '../core/french-date';
import { UnratedMarketDayView } from './market-days';

// A market that finished with no whole bilan, as the dashboard prompt names it (decision 65).
export class UnratedMarketDay {
  constructor(private readonly view: UnratedMarketDayView) {}

  marketId(): string {
    return this.view.marketId;
  }

  date(): string {
    return this.view.date;
  }

  label(): string {
    return longDate(this.view.day, this.view.date);
  }

  marketName(): string {
    return this.view.marketName;
  }
}
