import { InMemoryMarketDayViews } from '@market-miam/market-days';
import { marketDayViewsContract } from '../market-day-views.contract';

marketDayViewsContract('InMemoryMarketDayViews', () => new InMemoryMarketDayViews());
