import { InMemoryMarketScheduleViews } from '@market-miam/market-days';
import { marketScheduleViewsContract } from '../market-schedule-views.contract';

marketScheduleViewsContract('InMemoryMarketScheduleViews', () => new InMemoryMarketScheduleViews());
