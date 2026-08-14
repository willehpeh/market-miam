import { TestBed } from '@angular/core/testing';
import { waitFor } from '@testing-library/angular';
import { provideRouter, Router } from '@angular/router';
import { provideState, provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MarketDays } from './market-days';
import { HttpMarketDays } from './http.market-days';
import { marketDayFeature } from './market-day.state';
import { MarketDayEffects } from './market-day.effects';
import { MarketDayFacade } from './market-day.facade';
import { StoreMarketDayFacade } from './store.market-day.facade';
import { MarketSchedules, MarketScheduleView, NewSchedule } from '../markets/market-schedules';
import { HttpMarketSchedules } from '../markets/http.market-schedules';
import { marketScheduleFeature } from '../markets/market-schedule.state';
import { MarketScheduleEffects } from '../markets/market-schedule.effects';
import { MarketScheduleFacade } from '../markets/market-schedule.facade';
import { StoreMarketScheduleFacade } from '../markets/store.market-schedule.facade';

const day = {
  scheduleId: 'schedule-1',
  marketId: 'market-1',
  date: '2026-08-15',
  day: 'SAT',
  startTime: '08:00',
  endTime: '13:00',
  absent: false,
  today: false,
  market: { name: 'Marché de la Croix-Rousse', town: 'Lyon', codePostal: '69004' },
};

const asSent = (items: Record<string, unknown>[]) => ({ marketDays: [{ ...day, items }] });

describe('MarketDays', () => {
  let facade: MarketDayFacade;
  let schedules: MarketScheduleFacade;
  let httpCtrl: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: MarketDays, useClass: HttpMarketDays },
        provideStore(),
        provideState(marketDayFeature),
        provideEffects(MarketDayEffects),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'dashboard', children: [] },
          { path: 'dashboard/markets', children: [] },
        ]),
        { provide: MarketDayFacade, useClass: StoreMarketDayFacade },
        { provide: MarketSchedules, useClass: HttpMarketSchedules },
        provideState(marketScheduleFeature),
        provideEffects(MarketScheduleEffects),
        { provide: MarketScheduleFacade, useClass: StoreMarketScheduleFacade },
      ],
    });
    facade = TestBed.inject(MarketDayFacade);
    schedules = TestBed.inject(MarketScheduleFacade);
    httpCtrl = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpCtrl.verify();
  });

  it('requests the upcoming days when asked to load', () => {
    facade.load();

    const req = httpCtrl.expectOne('/api/market-days/upcoming');
    expect(req.request.method).toBe('GET');
  });

  // The API joins each day's menu to the catalogue. Nothing here renders that join: the
  // card counts ids, the editor ticks them, and both take names and prices from the
  // catalogue store.
  it('keeps the item ids and drops the detail joined onto them', () => {
    facade.load();

    httpCtrl.expectOne('/api/market-days/upcoming').flush(
      asSent([{ itemId: 'item-1', name: 'Bourguignon', description: '', price: 1300, imageReference: 'v1/x' }]),
    );

    expect(facade.days()).toEqual([{ ...day, itemIds: ['item-1'] }]);
    expect(facade.loading()).toBe(false);
  });

  // A second GET would land after the optimistic patch and overwrite it with a projection
  // that lags the response by 4–275ms, putting the stale menu back.
  it('does not ask again while fresh', () => {
    facade.load();
    httpCtrl.expectOne('/api/market-days/upcoming').flush(asSent([]));

    facade.load();

    httpCtrl.expectNone('/api/market-days/upcoming');
  });

  // Emptiness is a real answer — every day absent, or the schedule run dry — so it must
  // not read as "never fetched" and refetch on every visit.
  it('treats an empty list as fresh', () => {
    facade.load();
    httpCtrl.expectOne('/api/market-days/upcoming').flush({ marketDays: [] });

    facade.load();

    httpCtrl.expectNone('/api/market-days/upcoming');
  });

  describe('going stale when the schedule changes', () => {
    const newSchedule: NewSchedule = {
      market: { name: 'Marché de Monplaisir', codePostal: '69008', town: 'Lyon' },
      days: [{ day: 'TUE', startTime: '08:00', endTime: '13:00' }],
      frequency: { weeks: 1 },
    };

    it('asks for the days again after a market is registered', () => {
      facade.load();
      httpCtrl.expectOne('/api/market-days/upcoming').flush(asSent([]));

      schedules.registerSchedule(newSchedule);
      httpCtrl.expectOne('/api/market-schedules').flush(null);

      facade.load();

      httpCtrl.expectOne('/api/market-days/upcoming');
    });

    it('asks for the days again after a schedule is amended', () => {
      const existing: MarketScheduleView = {
        scheduleId: 'schedule-1',
        marketId: 'market-1',
        market: { name: 'Marché de la Croix-Rousse', codePostal: '69004', town: 'Lyon' },
        startDate: '2026-07-15',
        days: [{ day: 'SAT', startTime: '08:00', endTime: '13:00' }],
        frequency: { weeks: 1 },
      };
      facade.load();
      httpCtrl.expectOne('/api/market-days/upcoming').flush(asSent([]));
      schedules.load();
      httpCtrl.expectOne('/api/market-schedules').flush({ schedules: [existing] });

      schedules.amendSchedule('schedule-1', newSchedule);
      httpCtrl.expectOne('/api/market-schedules/schedule-1').flush(null);

      facade.load();

      httpCtrl.expectOne('/api/market-days/upcoming');
    });

    it('stays fresh when the registration fails', () => {
      facade.load();
      httpCtrl.expectOne('/api/market-days/upcoming').flush(asSent([]));

      schedules.registerSchedule(newSchedule);
      httpCtrl.expectOne('/api/market-schedules').flush(null, { status: 500, statusText: 'Server Error' });

      facade.load();

      httpCtrl.expectNone('/api/market-days/upcoming');
    });
  });

  // The menu is a set replaced whole, so clearing a day is an empty array, not a DELETE.
  it('puts the whole menu for the day', () => {
    facade.setMenu('market-1', '2026-08-15', ['item-2', 'item-1']);

    const req = httpCtrl.expectOne('/api/market-days/market-1/2026-08-15/menu');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ itemIds: ['item-2', 'item-1'] });
  });

  it('patches the saved day in place rather than refetching', async () => {
    facade.load();
    httpCtrl.expectOne('/api/market-days/upcoming').flush(asSent([{ itemId: 'item-1' }]));

    facade.setMenu('market-1', '2026-08-15', ['item-2', 'item-3']);
    httpCtrl.expectOne('/api/market-days/market-1/2026-08-15/menu').flush(null);

    await waitFor(() => expect(facade.days()).toEqual([{ ...day, itemIds: ['item-2', 'item-3'] }]));
    httpCtrl.expectNone('/api/market-days/upcoming');
  });

  it('leaves other days alone when one is saved', async () => {
    const other = { ...day, marketId: 'market-2', items: [] };
    facade.load();
    httpCtrl.expectOne('/api/market-days/upcoming').flush({ marketDays: [{ ...day, items: [] }, other] });

    facade.setMenu('market-1', '2026-08-15', ['item-9']);
    httpCtrl.expectOne('/api/market-days/market-1/2026-08-15/menu').flush(null);

    await waitFor(() =>
      expect(facade.days().map(d => ({ marketId: d.marketId, itemIds: d.itemIds }))).toEqual([
        { marketId: 'market-1', itemIds: ['item-9'] },
        { marketId: 'market-2', itemIds: [] },
      ]),
    );
  });

  it('returns to the dashboard once the menu is saved', async () => {
    const router = TestBed.inject(Router);
    facade.setMenu('market-1', '2026-08-15', []);

    httpCtrl.expectOne('/api/market-days/market-1/2026-08-15/menu').flush(null);

    await waitFor(() => expect(router.url).toBe('/dashboard'));
  });

  it('stops loading and stays empty when the request fails', () => {
    facade.load();

    httpCtrl.expectOne('/api/market-days/upcoming').flush(null, { status: 500, statusText: 'Server Error' });

    expect(facade.loading()).toBe(false);
    expect(facade.days()).toEqual([]);
  });
});
