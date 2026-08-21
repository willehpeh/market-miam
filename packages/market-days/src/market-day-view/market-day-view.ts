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
  // What time the stand shut, on the market's own wall clock. Kept because the two closes
  // are different facts: shut before opening is a day called off, shut after is a day
  // packed up early, and only the second is one to look back on (decision 75).
  closedAt?: string;
};

// What MarketDayMenuSet carries — sold-out is never set with the menu, it survives it
// through the intersection (mirroring market-day.ts:24), so setMenu never receives it.
export type MarketDayMenu = Omit<MarketDayView, 'soldOutItemIds' | 'outcomes' | 'closed' | 'closedAt'>;

// Which day an event lands on. MarketDayReopened carries a time too, which the view does
// not keep — a day that is open again is open, never since when.
export type MarketDayRef = {
  marketId: string;
  date: string;
};

// One close event's landing shape. The time is the payload's, not the store's own clock:
// the event says what the market's wall clock read (decision 35).
export type MarketDayClosure = MarketDayRef & {
  time: string;
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
