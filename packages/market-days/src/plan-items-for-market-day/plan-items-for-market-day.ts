import { PlannedItem } from '../market-day';

export type PlanItemsForMarketDay = {
  vendorId: string;
  items: PlannedItem[];
  marketId: string;
  date: string;
};
