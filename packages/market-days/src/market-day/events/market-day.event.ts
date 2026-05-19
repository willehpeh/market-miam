import { ItemMarkedAsSoldOut } from './item-marked-as-sold-out';
import { ItemsPlannedForMarketDay } from './items-planned-for-market-day';

export type MarketDayEvent = |
  ItemsPlannedForMarketDay |
  ItemMarkedAsSoldOut;
