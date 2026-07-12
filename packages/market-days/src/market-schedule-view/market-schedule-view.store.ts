import { MarketScheduleView } from './market-schedule-view';

export abstract class MarketScheduleViewStore {
  abstract recordSchedule(schedule: MarketScheduleView, vendorId: string): Promise<void>;
  abstract amendSchedule(schedule: MarketScheduleView, vendorId: string): Promise<void>;
  abstract cancelSchedule(scheduleId: string, vendorId: string): Promise<void>;
  abstract recordAbsence(scheduleId: string, vendorId: string, range: { from: string; to: string }): Promise<void>;
  abstract clear(): Promise<void>;
}
