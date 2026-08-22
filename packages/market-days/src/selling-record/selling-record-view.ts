import { ItemOutcome } from '../market-day/events';

// One bilan, as the retrospective reads it: what the vendor said, and the day they said it
// about. Not when they said it — a bilan made on Sunday judges Saturday's market.
export type Bilan = {
  date: string;
  outcome: ItemOutcome;
};

// One dish at one market. Oldest bilan first (BILAN-RETROSPECTIVE-PLAN.md decision 6).
export type ItemRecord = {
  itemId: string;
  bilans: Bilan[];
};

export type MarketRecord = {
  marketId: string;
  items: ItemRecord[];
};

// The vendor's whole set, sliced by whichever surface asked (decision 3). Raw bilans, not
// piles: the pile rule is a UX threshold the pilot is expected to move, so it lives in the
// frontend where moving it costs no migration (decision 4).
export type SellingRecordView = {
  markets: MarketRecord[];
};
