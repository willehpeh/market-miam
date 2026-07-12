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

  async amendSchedule(schedule: MarketScheduleView, vendorId: string): Promise<void> {
    const schedules = (await this.forVendor(vendorId)).schedules;
    const index = schedules.findIndex(candidate => candidate.scheduleId === schedule.scheduleId);
    if (index !== -1) {
      schedules[index] = { ...schedule, absences: schedules[index].absences };
    }
  }

  async cancelSchedule(scheduleId: string, vendorId: string): Promise<void> {
    const remaining = (await this.forVendor(vendorId)).schedules.filter(schedule => schedule.scheduleId !== scheduleId);
    this.schedules.set(vendorId, remaining);
  }

  async recordAbsence(scheduleId: string, vendorId: string, range: { from: string; to: string }): Promise<void> {
    const schedule = (await this.forVendor(vendorId)).schedules.find(candidate => candidate.scheduleId === scheduleId);
    if (schedule) {
      schedule.absences = [...(schedule.absences ?? []), range];
    }
  }

  async clear(): Promise<void> {
    this.schedules.clear();
  }

  async forVendor(vendorId: string): Promise<MarketSchedulesView> {
    return { schedules: this.schedules.get(vendorId) ?? [] };
  }
}
