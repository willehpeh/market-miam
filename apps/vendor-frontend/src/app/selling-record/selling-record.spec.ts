import { TestBed } from '@angular/core/testing';
import { provideState, provideStore, Store } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MarketRecord, SellingRecord } from './selling-record';
import { HttpSellingRecord } from './http.selling-record';
import { sellingRecordFeature } from './selling-record.state';
import { SellingRecordEffects } from './selling-record.effects';
import { SellingRecordFacade } from './selling-record.facade';
import { StoreSellingRecordFacade } from './store.selling-record.facade';
import { RecordBilanSuccess } from '../market-days/market-day.state';

const markets: MarketRecord[] = [
  { marketId: 'market-1', items: [{ itemId: 'item-1', bilans: [{ date: '2026-07-04', outcome: 'sold_out' }] }] },
];

describe('SellingRecord', () => {
  let facade: SellingRecordFacade;
  let httpCtrl: HttpTestingController;
  let store: Store;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: SellingRecord, useClass: HttpSellingRecord },
        provideStore(),
        provideState(sellingRecordFeature),
        provideEffects(SellingRecordEffects),
        provideHttpClientTesting(),
        { provide: SellingRecordFacade, useClass: StoreSellingRecordFacade },
      ],
    });
    facade = TestBed.inject(SellingRecordFacade);
    httpCtrl = TestBed.inject(HttpTestingController);
    store = TestBed.inject(Store);
  });

  afterEach(() => {
    httpCtrl.verify();
  });

  it('asks for the whole set when asked to load', () => {
    facade.load();

    const req = httpCtrl.expectOne('/api/selling-record');
    expect(req.request.method).toBe('GET');
  });

  it('shows as loading until the record arrives', () => {
    facade.load();

    httpCtrl.expectOne('/api/selling-record');
    expect(facade.loading()).toBe(true);
  });

  it('exposes the whole set once loaded', () => {
    facade.load();

    httpCtrl.expectOne('/api/selling-record').flush({ markets });

    expect(facade.markets()).toEqual(markets);
    expect(facade.loading()).toBe(false);
  });

  // The menu editor gates its spinner on this feed (decision 11), so a failure that left
  // loading set would hold the whole screen behind a spinner over the one feed it can do
  // without. No piles is a degradation; no menu is an outage.
  it('gives up quietly when the request fails', () => {
    facade.load();

    httpCtrl.expectOne('/api/selling-record').flush(null, { status: 500, statusText: 'Server Error' });

    expect(facade.markets()).toEqual([]);
    expect(facade.loading()).toBe(false);
  });

  // Every menu editor opened asks for this, once per market day the vendor plans. The set
  // is the largest of the editor's four feeds and it only moves when a bilan is recorded.
  it('does not refetch a set it already holds', () => {
    facade.load();
    httpCtrl.expectOne('/api/selling-record').flush({ markets });

    facade.load();

    httpCtrl.verify();
  });

  // The one thing that moves this set. Without it a vendor who records Saturday's bilan
  // and opens Monday's menu sees piles that do not know about Saturday, until they reload
  // the app. Partial on purpose: a half-answered bilan is still unrated for the prompt's
  // purposes (market days decision 65), but the outcomes it did carry are recorded, so it
  // moves this set exactly as a whole one does.
  it('refetches once a bilan has been recorded, whole or partial', () => {
    facade.load();
    httpCtrl.expectOne('/api/selling-record').flush({ markets });

    store.dispatch(
      RecordBilanSuccess({ marketId: 'market-1', date: '2026-07-11', outcomes: {}, complete: false }),
    );
    facade.load();

    expect(httpCtrl.expectOne('/api/selling-record').request.method).toBe('GET');
  });
});
