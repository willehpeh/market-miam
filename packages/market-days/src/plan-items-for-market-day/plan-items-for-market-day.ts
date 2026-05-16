export type PlanItemsForMarketDay = {
  vendorId: string;
  items: { itemId: string; quantity?: number }[];
  marketId: string;
  date: string;
};
