import { ItemMarkedAsAvailable } from './item-marked-as-available';
import { ItemMarkedAsSoldOut } from './item-marked-as-sold-out';
import { MarketDayMenuSet } from './market-day-menu-set';

export type MarketDayEvent = |
  MarketDayMenuSet |
  ItemMarkedAsSoldOut |
  ItemMarkedAsAvailable;
