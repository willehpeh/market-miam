import { MarketScheduleView } from './market-schedule-view';

export abstract class MarketScheduleViewStore {
  abstract recordSchedule(schedule: MarketScheduleView, vendorId: string): Promise<void>;
  abstract clear(): Promise<void>;
}
