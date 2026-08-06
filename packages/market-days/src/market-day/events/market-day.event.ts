import { ItemMarkedAsSoldOut } from './item-marked-as-sold-out';
import { ItemUnplannedFromMarketDay } from './item-unplanned-from-market-day';
import { ItemsPlannedForMarketDay } from './items-planned-for-market-day';
import { MarketDayMenuSet } from './market-day-menu-set';

export type MarketDayEvent = |
  ItemsPlannedForMarketDay |
  ItemMarkedAsSoldOut |
  ItemUnplannedFromMarketDay |
  MarketDayMenuSet;
