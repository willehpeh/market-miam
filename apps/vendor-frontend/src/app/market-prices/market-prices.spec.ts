import { TestBed } from '@angular/core/testing';
import { provideState, provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MarketPrices, MarketPricesView } from './market-prices';
import { HttpMarketPrices } from './http.market-prices';
import { marketPricesFeature } from './market-prices.state';
import { MarketPricesEffects } from './market-prices.effects';
import { MarketPricesFacade } from './market-prices.facade';
import { StoreMarketPricesFacade } from './store.market-prices.facade';

const markets: MarketPricesView[] = [{ marketId: 'market-1', prices: { 'item-1': 1500 } }];

describe('MarketPrices', () => {
  let facade: MarketPricesFacade;
  let httpCtrl: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: MarketPrices, useClass: HttpMarketPrices },
        provideStore(),
        provideState(marketPricesFeature),
        provideEffects(MarketPricesEffects),
        provideHttpClientTesting(),
        { provide: MarketPricesFacade, useClass: StoreMarketPricesFacade },
      ],
    });
    facade = TestBed.inject(MarketPricesFacade);
    httpCtrl = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpCtrl.verify();
  });

  it('requests every market it prices when asked to load', () => {
    facade.load();

    const req = httpCtrl.expectOne('/api/market-prices');
    expect(req.request.method).toBe('GET');
  });

  it('shows as loading until the prices arrive', () => {
    facade.load();

    httpCtrl.expectOne('/api/market-prices');
    expect(facade.loading()).toBe(true);
  });

  it('exposes the markets once loaded', () => {
    facade.load();

    httpCtrl.expectOne('/api/market-prices').flush({ markets });

    expect(facade.markets()).toEqual(markets);
    expect(facade.loading()).toBe(false);
  });

  it('stays empty when the request fails', () => {
    facade.load();

    httpCtrl.expectOne('/api/market-prices').flush(null, { status: 500, statusText: 'Server Error' });

    expect(facade.markets()).toEqual([]);
    expect(facade.loading()).toBe(false);
  });

  it('sends the whole list to the market it prices', () => {
    facade.setPrices('market-1', { 'item-1': 1500 });

    const req = httpCtrl.expectOne('/api/market-prices/market-1');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ prices: { 'item-1': 1500 } });
  });

  it('patches the market it has just saved', () => {
    facade.setPrices('market-1', { 'item-1': 1500 });
    httpCtrl.expectOne('/api/market-prices/market-1').flush(null);

    expect(facade.markets()).toEqual([{ marketId: 'market-1', prices: { 'item-1': 1500 } }]);
  });

  it('replaces a market\'s list rather than appending to it', () => {
    facade.load();
    httpCtrl.expectOne('/api/market-prices').flush({ markets });

    facade.setPrices('market-1', { 'item-1': 1700 });
    httpCtrl.expectOne('/api/market-prices/market-1').flush(null);

    expect(facade.markets()).toEqual([{ marketId: 'market-1', prices: { 'item-1': 1700 } }]);
  });

  it('leaves the stored list alone when the save fails', () => {
    facade.load();
    httpCtrl.expectOne('/api/market-prices').flush({ markets });

    facade.setPrices('market-1', { 'item-1': 1700 });
    httpCtrl.expectOne('/api/market-prices/market-1').flush(null, { status: 500, statusText: 'Server Error' });

    expect(facade.markets()).toEqual(markets);
  });

  // A second GET would land after the patch and put the lagging projection back over it.
  it('does not refetch a set it already holds', () => {
    facade.load();
    httpCtrl.expectOne('/api/market-prices').flush({ markets });

    facade.load();

    httpCtrl.verify();
  });
});
