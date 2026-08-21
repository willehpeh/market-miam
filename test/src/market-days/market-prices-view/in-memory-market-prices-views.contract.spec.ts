import { InMemoryMarketPricesViews } from '@market-miam/market-days';
import { marketPricesViewsContract } from '../market-prices-views.contract';

marketPricesViewsContract('InMemoryMarketPricesViews', () => new InMemoryMarketPricesViews());
