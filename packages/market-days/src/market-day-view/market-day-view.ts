export type MarketDayView = {
  marketId: string;
  date: string;
  itemIds: string[];
  soldOutItemIds: string[];
};

// What MarketDayMenuSet carries — sold-out is never set with the menu, it survives it
// through the intersection (mirroring market-day.ts:24), so setMenu never receives it.
export type MarketDayMenu = Omit<MarketDayView, 'soldOutItemIds'>;

// One availability event's landing shape — the payload of ItemMarkedAsSoldOut and
// ItemMarkedAsAvailable, minus the time, which the view does not keep.
export type AvailabilityMark = {
  marketId: string;
  date: string;
  itemId: string;
};
