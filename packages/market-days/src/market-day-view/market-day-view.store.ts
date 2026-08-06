import { MarketDayView } from './market-day-view';

export abstract class MarketDayViewStore {
  abstract setMenu(menu: MarketDayView, vendorId: string): Promise<void>;
  abstract clear(): Promise<void>;
}
