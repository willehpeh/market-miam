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
  phase: 'future',
  closed: false,
  soldOutItemIds: [],
  market: { name: 'Marché de la Croix-Rousse', town: 'Lyon', codePostal: '69004' },
};

const availability = (itemId: string) => `/api/market-days/market-1/2026-08-15/items/${itemId}/availability`;
const closure = '/api/market-days/market-1/2026-08-15/closed';

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
          { path: 'dashboard/live/:marketId/:date', children: [] },
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

  // The waiting poll's re-ask (decision 27): refresh ignores freshness — it exists to
  // learn what only time changes — but must not flip the screen into a spinner each tick.
  it('refreshes even while fresh, without going into loading', () => {
    facade.load();
    httpCtrl.expectOne('/api/market-days/upcoming').flush(asSent([]));

    facade.refresh();

    expect(facade.loading()).toBe(false);
    httpCtrl.expectOne('/api/market-days/upcoming').flush(asSent([]));
  });

  // One idempotent route behind both commands (decision 19): a phone retrying on bad
  // market signal must be safe, and {soldOut: true} twice is.
  it('puts the availability change for one item', () => {
    facade.markSoldOut('market-1', '2026-08-15', 'item-1');

    const req = httpCtrl.expectOne(availability('item-1'));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ soldOut: true });
    req.flush(null);
  });

  it('restores availability through the same route', () => {
    facade.markAvailable('market-1', '2026-08-15', 'item-1');

    const req = httpCtrl.expectOne(availability('item-1'));
    expect(req.request.body).toEqual({ soldOut: false });
    req.flush(null);
  });

  // The moving row is the vendor's receipt, so it cannot wait on market wifi: the patch
  // lands on dispatch and the queue drains behind the UI.
  it('moves the row before the request settles, and never refetches', () => {
    facade.load();
    httpCtrl.expectOne('/api/market-days/upcoming').flush(asSent([{ itemId: 'item-1' }]));

    facade.markSoldOut('market-1', '2026-08-15', 'item-1');

    expect(facade.days()[0].soldOutItemIds).toEqual(['item-1']);
    httpCtrl.expectOne(availability('item-1')).flush(null);
    expect(facade.days()[0].soldOutItemIds).toEqual(['item-1']);
    httpCtrl.expectNone('/api/market-days/upcoming');
  });

  // concatMap, deliberately (decision 22): switchMap would cancel the in-flight mark when
  // the next tap lands — three dishes in five seconds and only the last survives.
  it('queues rapid taps instead of cancelling the one in flight', () => {
    facade.markSoldOut('market-1', '2026-08-15', 'item-1');
    facade.markSoldOut('market-1', '2026-08-15', 'item-2');

    httpCtrl.expectNone(availability('item-2'));
    httpCtrl.expectOne(availability('item-1')).flush(null);
    httpCtrl.expectOne(availability('item-2')).flush(null);
  });

  // Silent snap-back, no toast — the row returning is the disclosure, consistent with
  // decision 7's no-toast stance.
  it('snaps the row back when the tap fails', () => {
    facade.load();
    httpCtrl.expectOne('/api/market-days/upcoming').flush(asSent([{ itemId: 'item-1' }]));

    facade.markSoldOut('market-1', '2026-08-15', 'item-1');
    expect(facade.days()[0].soldOutItemIds).toEqual(['item-1']);

    httpCtrl.expectOne(availability('item-1')).flush(null, { status: 500, statusText: 'Server Error' });

    expect(facade.days()[0].soldOutItemIds).toEqual([]);
  });

  it('snaps a failed restore back too', () => {
    facade.load();
    httpCtrl.expectOne('/api/market-days/upcoming')
      .flush({ marketDays: [{ ...day, items: [{ itemId: 'item-1' }], soldOutItemIds: ['item-1'] }] });

    facade.markAvailable('market-1', '2026-08-15', 'item-1');
    expect(facade.days()[0].soldOutItemIds).toEqual([]);

    httpCtrl.expectOne(availability('item-1')).flush(null, { status: 500, statusText: 'Server Error' });

    expect(facade.days()[0].soldOutItemIds).toEqual(['item-1']);
  });

  // Availability's shape for the same reasons (decision 44): a vendor packing up on bad
  // market signal retries, and {closed: true} twice is safe.
  it('puts the closure', () => {
    facade.close('market-1', '2026-08-15');

    const req = httpCtrl.expectOne(closure);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ closed: true });
    req.flush(null);
  });

  it('reopens through the same route', () => {
    facade.reopen('market-1', '2026-08-15');

    const req = httpCtrl.expectOne(closure);
    expect(req.request.body).toEqual({ closed: false });
    req.flush(null);
  });

  // Decision 38's whole-screen flip is decision 7's receipt at screen scale, so it cannot
  // wait on market wifi either: the vendor packing up sees the stand shut on the tap.
  it('flips the day closed before the request settles, and never refetches', () => {
    facade.load();
    httpCtrl.expectOne('/api/market-days/upcoming').flush(asSent([{ itemId: 'item-1' }]));

    facade.close('market-1', '2026-08-15');

    expect(facade.days()[0].closed).toBe(true);
    httpCtrl.expectOne(closure).flush(null);
    expect(facade.days()[0].closed).toBe(true);
    httpCtrl.expectNone('/api/market-days/upcoming');
  });

  // Silent snap-back, the availability pair's stance (decision 7): the stand coming back
  // open is the disclosure, and a vendor who walked away from a dead connection sees the
  // true state when they look again.
  it('reopens the day when the close fails', () => {
    facade.load();
    httpCtrl.expectOne('/api/market-days/upcoming').flush(asSent([{ itemId: 'item-1' }]));

    facade.close('market-1', '2026-08-15');
    expect(facade.days()[0].closed).toBe(true);

    httpCtrl.expectOne(closure).flush(null, { status: 500, statusText: 'Server Error' });

    expect(facade.days()[0].closed).toBe(false);
  });

  // Two markets can share a date (decision 25's overlap), so the patch and its snap-back
  // both have to address one day rather than the vendor's whole list.
  it('closes only the day it was asked about, and snaps only that one back', () => {
    facade.load();
    httpCtrl
      .expectOne('/api/market-days/upcoming')
      .flush({ marketDays: [{ ...day, items: [] }, { ...day, marketId: 'market-2', items: [] }] });

    facade.close('market-1', '2026-08-15');
    expect(facade.days().map(each => each.closed)).toEqual([true, false]);

    httpCtrl.expectOne(closure).flush(null, { status: 500, statusText: 'Server Error' });

    expect(facade.days().map(each => each.closed)).toEqual([false, false]);
  });

  it('returns to the dashboard once the menu is saved', async () => {
    const router = TestBed.inject(Router);
    facade.setMenu('market-1', '2026-08-15', []);

    httpCtrl.expectOne('/api/market-days/market-1/2026-08-15/menu').flush(null);

    await waitFor(() => expect(router.url).toBe('/dashboard'));
  });

  // The editor has two doorways now (decision 10, and decision 51's unplanned today), so
  // its exit mirrors the card's own gate rather than always landing on the dashboard: a
  // vendor who added a tray mid-market goes back to the screen they were running the day on.
  it('returns to the live screen when the day it saved is today', async () => {
    const router = TestBed.inject(Router);
    facade.load();
    httpCtrl.expectOne('/api/market-days/upcoming').flush({ marketDays: [{ ...day, phase: 'due', items: [] }] });

    facade.setMenu('market-1', '2026-08-15', ['item-1']);
    httpCtrl.expectOne('/api/market-days/market-1/2026-08-15/menu').flush(null);

    await waitFor(() => expect(router.url).toBe('/dashboard/live/market-1/2026-08-15'));
  });

  it('stops loading and stays empty when the request fails', () => {
    facade.load();

    httpCtrl.expectOne('/api/market-days/upcoming').flush(null, { status: 500, statusText: 'Server Error' });

    expect(facade.loading()).toBe(false);
    expect(facade.days()).toEqual([]);
  });

  // A failed load must not read as fresh, or the dashboard stays empty for the whole
  // session; the next screen visit retries instead.
  it('asks again after a failed load', () => {
    facade.load();
    httpCtrl.expectOne('/api/market-days/upcoming').flush(null, { status: 500, statusText: 'Server Error' });

    facade.load();

    httpCtrl.expectOne('/api/market-days/upcoming');
  });
});
