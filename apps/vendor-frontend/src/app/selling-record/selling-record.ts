import { Observable } from 'rxjs';
import { ItemOutcome } from '../market-days/market-days';

// The payload verbatim, as the API answers it: raw bilans, never piles. The pile rule is a
// UX threshold the pilot is expected to move, so it lives on this side of the wire where
// moving it costs no migration (BILAN-RETROSPECTIVE-PLAN.md decision 4).
export interface Bilan {
  date: string;
  outcome: ItemOutcome;
}

// Oldest bilan first (decision 6). The order of markets, and of items within them, is
// incidental — every surface joins the catalogue for names and renders in that order.
export interface ItemRecord {
  itemId: string;
  bilans: Bilan[];
}

export interface MarketRecord {
  marketId: string;
  items: ItemRecord[];
}

export interface SellingRecordView {
  markets: MarketRecord[];
}

export abstract class SellingRecord {
  abstract list(): Observable<SellingRecordView>;
}
