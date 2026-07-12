import { MarketSchedulesView } from './market-schedule-view';

export abstract class MarketScheduleViews {
  abstract forVendor(vendorId: string): Promise<MarketSchedulesView>;
}
