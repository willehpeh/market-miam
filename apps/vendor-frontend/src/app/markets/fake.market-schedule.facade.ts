import { Injectable, signal } from '@angular/core';
import { MarketScheduleFacade } from './market-schedule.facade';
import { MarketScheduleView } from './market-schedules';

@Injectable()
export class FakeMarketScheduleFacade implements MarketScheduleFacade {
  readonly schedules = signal<MarketScheduleView[]>([]);
  readonly loading = signal(false);
  loaded = false;

  load(): void {
    this.loaded = true;
  }
}
