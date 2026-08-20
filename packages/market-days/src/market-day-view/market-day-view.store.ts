import { AvailabilityMark, MarketDayMenu, MarketDayRef, OutcomeMark } from './market-day-view';

export abstract class MarketDayViewStore {
  abstract setMenu(menu: MarketDayMenu, vendorId: string): Promise<void>;
  abstract markSoldOut(mark: AvailabilityMark, vendorId: string): Promise<void>;
  abstract markAvailable(mark: AvailabilityMark, vendorId: string): Promise<void>;
  abstract recordOutcome(mark: OutcomeMark, vendorId: string): Promise<void>;
  abstract close(day: MarketDayRef, vendorId: string): Promise<void>;
  abstract reopen(day: MarketDayRef, vendorId: string): Promise<void>;
  abstract clear(): Promise<void>;
}
