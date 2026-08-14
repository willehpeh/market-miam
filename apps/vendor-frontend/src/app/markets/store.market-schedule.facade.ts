import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { MarketScheduleFacade } from './market-schedule.facade';
import { MarketScheduleView, NewSchedule } from './market-schedules';
import { AmendMarketSchedule, LoadMarketSchedules, RegisterMarketSchedule, marketScheduleFeature } from './market-schedule.state';

@Injectable()
export class StoreMarketScheduleFacade implements MarketScheduleFacade {
  private readonly store = inject(Store);

  readonly schedules = this.store.selectSignal(marketScheduleFeature.selectSchedules);
  readonly loading = this.store.selectSignal(marketScheduleFeature.selectLoading);
  private readonly fresh = this.store.selectSignal(marketScheduleFeature.selectFresh);

  // Only a stale cache refetches: a re-GET would put a projection that lags the response
  // back over an optimistic patch. Emptiness is a real answer — a vendor can retire every
  // schedule — so the flag, not the list length.
  load(): void {
    if (!this.fresh()) {
      this.store.dispatch(LoadMarketSchedules());
    }
  }

  registerSchedule(schedule: NewSchedule): void {
    const body: MarketScheduleView = {
      scheduleId: crypto.randomUUID(),
      marketId: crypto.randomUUID(),
      market: schedule.market,
      startDate: today(),
      days: schedule.days,
      frequency: schedule.frequency,
    };
    this.store.dispatch(RegisterMarketSchedule({ schedule: body }));
  }

  amendSchedule(scheduleId: string, schedule: NewSchedule): void {
    const existing = this.schedules().find((candidate) => candidate.scheduleId === scheduleId);
    if (!existing) {
      return;
    }
    const body: MarketScheduleView = {
      scheduleId,
      marketId: existing.marketId,
      market: schedule.market,
      startDate: existing.startDate,
      days: schedule.days,
      frequency: schedule.frequency,
    };
    this.store.dispatch(AmendMarketSchedule({ schedule: body }));
  }
}

function today(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}
