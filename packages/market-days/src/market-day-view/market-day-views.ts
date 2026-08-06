import { MarketDayView } from './market-day-view';

export abstract class MarketDayViews {
  abstract menuFor(vendorId: string, marketId: string, date: string): Promise<MarketDayView>;
}
