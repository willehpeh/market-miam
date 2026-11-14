import { Injectable, signal } from '@angular/core';
import { MarketScheduleFacade } from './market-schedule.facade';
import { MarketScheduleView, NewSchedule } from './market-schedules';

@Injectable()
export class FakeMarketScheduleFacade implements MarketScheduleFacade {
  readonly schedules = signal<MarketScheduleView[]>([]);
  readonly loading = signal(false);
  loaded = false;
  registered: NewSchedule | undefined;
  amended: { scheduleId: string; schedule: NewSchedule } | undefined;

  load(): void {
    this.loaded = true;
  }

  registerSchedule(schedule: NewSchedule): void {
    this.registered = schedule;
  }

  amendSchedule(scheduleId: string, schedule: NewSchedule): void {
    this.amended = { scheduleId, schedule };
  }
}

// Schedules that have already loaded.
export function schedulesOf(...schedules: MarketScheduleView[]): FakeMarketScheduleFacade {
  const markets = new FakeMarketScheduleFacade();
  markets.schedules.set(schedules);
  return markets;
}
