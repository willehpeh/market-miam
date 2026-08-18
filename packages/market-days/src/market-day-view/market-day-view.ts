export type MarketDayView = {
  marketId: string;
  date: string;
  itemIds: string[];
  soldOutItemIds: string[];
  closed: boolean;
};

// What MarketDayMenuSet carries — sold-out is never set with the menu, it survives it
// through the intersection (mirroring market-day.ts:24), so setMenu never receives it.
export type MarketDayMenu = Omit<MarketDayView, 'soldOutItemIds' | 'closed'>;

// Which day an event lands on. MarketDayClosed and MarketDayReopened carry a time too,
// which the view does not keep — the row says closed or not, never since when.
export type MarketDayRef = {
  marketId: string;
  date: string;
};

// One availability event's landing shape — the payload of ItemMarkedAsSoldOut and
// ItemMarkedAsAvailable, minus the time, which the view does not keep.
export type AvailabilityMark = MarketDayRef & {
  itemId: string;
};
