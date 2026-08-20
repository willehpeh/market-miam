import { ItemMarkedAsAvailable } from './item-marked-as-available';
import { ItemMarkedAsSoldOut } from './item-marked-as-sold-out';
import { MarketDayBilanRecorded } from './market-day-bilan-recorded';
import { MarketDayClosed } from './market-day-closed';
import { MarketDayMenuSet } from './market-day-menu-set';
import { MarketDayReopened } from './market-day-reopened';

export type MarketDayEvent = |
  MarketDayMenuSet |
  ItemMarkedAsSoldOut |
  ItemMarkedAsAvailable |
  MarketDayBilanRecorded |
  MarketDayClosed |
  MarketDayReopened;
