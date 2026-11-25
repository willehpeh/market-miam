import { MarketDayPhase } from '../market-schedule-view/market-day-clock';

export type LiveMarketDay = {
  itemIds: string[];
  soldOutItemIds: string[];
  closed: boolean;
  phase: MarketDayPhase;
};
