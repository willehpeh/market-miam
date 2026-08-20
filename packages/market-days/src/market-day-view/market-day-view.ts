import { ItemOutcome } from '../market-day/events';

export type MarketDayView = {
  marketId: string;
  date: string;
  itemIds: string[];
  soldOutItemIds: string[];
  // The bilan, by item — what the vendor said about how each dish sold (decision 64).
  // Sparse: an item with no answer yet is simply absent, which is what the dashboard
  // prompt reads to know a day is unrated (decision 65).
  outcomes: Record<string, ItemOutcome>;
  closed: boolean;
};

// What MarketDayMenuSet carries — sold-out is never set with the menu, it survives it
// through the intersection (mirroring market-day.ts:24), so setMenu never receives it.
export type MarketDayMenu = Omit<MarketDayView, 'soldOutItemIds' | 'outcomes' | 'closed'>;

// Which day an event lands on. MarketDayClosed and MarketDayReopened carry a time too,
// which the view does not keep — the row says closed or not, never since when.
export type MarketDayRef = {
  marketId: string;
  date: string;
};

// One bilan event's landing shape — the whole reckoning, replacing what the row held
// (decision 72). The row says what the vendor decided, never when.
export type BilanRecord = MarketDayRef & {
  outcomes: Record<string, ItemOutcome>;
};

// One availability event's landing shape — the payload of ItemMarkedAsSoldOut and
// ItemMarkedAsAvailable, minus the time, which the view does not keep.
export type AvailabilityMark = MarketDayRef & {
  itemId: string;
};
