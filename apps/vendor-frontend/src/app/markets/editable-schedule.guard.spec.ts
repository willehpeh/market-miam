import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AddSchedule } from './add-schedule';
import { MarketsList } from './markets-list';
import { editableSchedule } from './editable-schedule.guard';
import { MarketScheduleFacade } from './market-schedule.facade';
import { FakeMarketScheduleFacade } from './fake.market-schedule.facade';
import { MarketScheduleView } from './market-schedules';

const existing: MarketScheduleView = {
  scheduleId: 'schedule-1',
  marketId: 'market-1',
  market: { name: 'Marché de Belleville', codePostal: '75011', town: 'Paris' },
  startDate: '2026-07-15',
  days: [{ day: 'TUE', startTime: '07:00', endTime: '14:30' }],
  frequency: { weeks: 1 },
};

describe('editableSchedule guard', () => {
  let fake: FakeMarketScheduleFacade;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    fake = new FakeMarketScheduleFacade();
    // A realistic load: a cold store fills from the backend.
    fake.load = () => {
      fake.loaded = true;
      fake.schedules.set([existing]);
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'dashboard/markets', component: MarketsList },
          { path: 'dashboard/markets/:scheduleId/edit', component: AddSchedule, canActivate: [editableSchedule] },
        ]),
        { provide: MarketScheduleFacade, useValue: fake },
      ],
    });
    harness = await RouterTestingHarness.create();
  });

  it('warms a cold store so a direct-nav edit prefills instead of adding', async () => {
    await harness.navigateByUrl('/dashboard/markets/schedule-1/edit', AddSchedule);
    harness.detectChanges();

    expect(TestBed.inject(Router).url).toBe('/dashboard/markets/schedule-1/edit');
    const form = harness.routeNativeElement!;
    expect(form.textContent).toContain('Modifier le marché');
    expect(form.querySelector('#name')).toHaveValue('Marché de Belleville');
  });

  it('bounces to the calendar when the schedule is unknown', async () => {
    await harness.navigateByUrl('/dashboard/markets/ghost/edit');

    expect(TestBed.inject(Router).url).toBe('/dashboard/markets');
  });

  // "does not reload a warm store" used to live here. The screen now asks for the
  // schedules itself, so this route can no longer observe who asked — and warm-only is
  // the facade's promise anyway, kept by market-schedule.spec.ts's "does not ask again
  // while fresh". What is left of this guard goes with the next change.
  it('prefills from a store that is already warm', async () => {
    fake.schedules.set([existing]);

    await harness.navigateByUrl('/dashboard/markets/schedule-1/edit', AddSchedule);
    harness.detectChanges();

    expect(harness.routeNativeElement!.querySelector('#name')).toHaveValue('Marché de Belleville');
  });
});
