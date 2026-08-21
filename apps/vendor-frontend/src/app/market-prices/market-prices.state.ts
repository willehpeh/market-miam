import { createAction, createFeature, createReducer, on, props } from '@ngrx/store';
import { MarketPricesView, PriceList } from './market-prices';

export const LoadMarketPrices = createAction('[Market Prices] Load Market Prices');
export const LoadMarketPricesSuccess = createAction(
  '[Market Prices] Load Market Prices Success',
  props<{ markets: MarketPricesView[] }>(),
);
export const LoadMarketPricesFailure = createAction('[Market Prices] Load Market Prices Failure');

export const SetMarketPrices = createAction(
  '[Market Prices] Set Market Prices',
  props<{ marketId: string; prices: PriceList }>(),
);
export const SetMarketPricesSuccess = createAction(
  '[Market Prices] Set Market Prices Success',
  props<{ marketId: string; prices: PriceList }>(),
);
export const SetMarketPricesFailure = createAction('[Market Prices] Set Market Prices Failure');

export interface MarketPricesState {
  loading: boolean;
  fresh: boolean;
  markets: MarketPricesView[];
}

export const initialState: MarketPricesState = { loading: false, fresh: false, markets: [] };

export const marketPricesFeature = createFeature({
  name: 'marketPrices',
  reducer: createReducer<MarketPricesState>(
    initialState,
    on(LoadMarketPrices, (state): MarketPricesState => ({ ...state, loading: true })),
    on(LoadMarketPricesSuccess, (state, { markets }): MarketPricesState => ({ ...state, loading: false, fresh: true, markets })),
    on(LoadMarketPricesFailure, (state): MarketPricesState => ({ ...state, loading: false })),
    // A failed load leaves the cache stale on purpose: the next screen visit retries.
    // Patched on success, not optimistically: the editor is one form with one save, and a
    // whole-list rollback would need the previous list carried on the failure.
    on(SetMarketPricesSuccess, (state, { marketId, prices }): MarketPricesState => ({
      ...state,
      fresh: true,
      markets: [...state.markets.filter((market) => market.marketId !== marketId), { marketId, prices }],
    })),
  ),
});
