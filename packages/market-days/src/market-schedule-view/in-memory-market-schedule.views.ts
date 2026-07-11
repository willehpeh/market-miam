import { MarketScheduleView, MarketSchedulesView } from './market-schedule-view';
import { MarketScheduleViews } from './market-schedule-views';
import { MarketScheduleViewStore } from './market-schedule-view.store';

export class InMemoryMarketScheduleViews implements MarketScheduleViews, MarketScheduleViewStore {
  private readonly schedules = new Map<string, MarketScheduleView[]>();

  async recordSchedule(schedule: MarketScheduleView, vendorId: string): Promise<void> {
    const existing = (await this.forVendor(vendorId)).schedules;
    const index = existing.findIndex(candidate => candidate.scheduleId === schedule.scheduleId);
    if (index === -1) {
      existing.push(schedule);
    } else {
      existing[index] = schedule;
    }
    this.schedules.set(vendorId, existing);
  }

  async clear(): Promise<void> {
    this.schedules.clear();
  }

  async forVendor(vendorId: string): Promise<MarketSchedulesView> {
    return { schedules: this.schedules.get(vendorId) ?? [] };
  }
}
