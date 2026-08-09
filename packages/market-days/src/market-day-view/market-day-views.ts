import { MarketDayView } from './market-day-view';

export abstract class MarketDayViews {
  // A window rather than a point lookup: every read expands a schedule over a period, so
  // one range scan serves a whole query. Inclusive both ends; days nobody planned are
  // absent from the result rather than returned empty.
  abstract menusFor(vendorId: string, from: string, to: string): Promise<MarketDayView[]>;
}
