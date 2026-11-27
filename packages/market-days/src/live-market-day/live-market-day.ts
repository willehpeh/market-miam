import { MarketDayPhase } from '../market-schedule-view/market-day-clock';

export type LiveDish = {
  itemId: string;
  name: string;
  price?: number;
  variants?: { name: string; price: number }[];
  soldOut: boolean;
};

export type LiveMarketDay = {
  dishes: LiveDish[];
  closed: boolean;
  phase: MarketDayPhase;
};
