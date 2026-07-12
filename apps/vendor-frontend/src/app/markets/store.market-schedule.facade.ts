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

  load(): void {
    this.store.dispatch(LoadMarketSchedules());
  }

  registerSchedule(schedule: NewSchedule): void {
    const body: MarketScheduleView = {
      scheduleId: crypto.randomUUID(),
      market: { id: crypto.randomUUID(), ...schedule.market },
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
      market: { id: existing.market.id, ...schedule.market },
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
