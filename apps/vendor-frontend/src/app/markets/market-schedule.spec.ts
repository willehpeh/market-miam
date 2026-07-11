import { TestBed } from '@angular/core/testing';
import { provideState, provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MarketSchedules, MarketScheduleView } from './market-schedules';
import { HttpMarketSchedules } from './http.market-schedules';
import { marketScheduleFeature } from './market-schedule.state';
import { MarketScheduleEffects } from './market-schedule.effects';
import { MarketScheduleFacade } from './market-schedule.facade';
import { StoreMarketScheduleFacade } from './store.market-schedule.facade';

const schedules: MarketScheduleView[] = [
  {
    scheduleId: 'schedule-1',
    market: { id: 'market-1', name: 'Marché de la Croix-Rousse', codePostal: '69004', town: 'Lyon' },
    startDate: '2026-07-15',
    days: [{ day: 'TUE', startTime: '08:00', endTime: '13:00' }],
    frequency: { weeks: 1 },
  },
];

describe('MarketSchedules', () => {
  let facade: MarketScheduleFacade;
  let httpCtrl: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: MarketSchedules, useClass: HttpMarketSchedules },
        provideStore(),
        provideState(marketScheduleFeature),
        provideEffects(MarketScheduleEffects),
        provideHttpClientTesting(),
        { provide: MarketScheduleFacade, useClass: StoreMarketScheduleFacade },
      ],
    });
    facade = TestBed.inject(MarketScheduleFacade);
    httpCtrl = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpCtrl.verify();
  });

  it('requests the schedules when asked to load', () => {
    facade.load();

    const req = httpCtrl.expectOne('/api/market-schedules');
    expect(req.request.method).toBe('GET');
  });

  it('shows as loading until the schedules arrive', () => {
    facade.load();

    httpCtrl.expectOne('/api/market-schedules');
    expect(facade.loading()).toBe(true);
  });

  it('exposes the schedules once loaded', () => {
    facade.load();

    httpCtrl.expectOne('/api/market-schedules').flush({ schedules });

    expect(facade.schedules()).toEqual(schedules);
    expect(facade.loading()).toBe(false);
  });

  it('stops loading and stays empty when the request fails', () => {
    facade.load();

    httpCtrl.expectOne('/api/market-schedules').flush(null, { status: 500, statusText: 'Server Error' });

    expect(facade.loading()).toBe(false);
    expect(facade.schedules()).toEqual([]);
  });
});
