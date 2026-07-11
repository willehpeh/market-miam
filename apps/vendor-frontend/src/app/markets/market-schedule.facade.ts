import { Signal } from '@angular/core';
import { MarketScheduleView, NewSchedule } from './market-schedules';

export abstract class MarketScheduleFacade {
  abstract readonly schedules: Signal<MarketScheduleView[]>;
  abstract readonly loading: Signal<boolean>;

  abstract load(): void;
  abstract registerSchedule(schedule: NewSchedule): void;
}
