import { Signal } from '@angular/core';
import { MarketScheduleView } from './market-schedules';

export abstract class MarketScheduleFacade {
  abstract readonly schedules: Signal<MarketScheduleView[]>;
  abstract readonly loading: Signal<boolean>;

  abstract load(): void;
}
