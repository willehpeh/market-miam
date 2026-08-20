import { DomainEvent } from '@market-miam/event-sourcing';

// How a dish sold, in the vendor's own judgment (decision 49). `sold_out` is the one the
// service log can prefill; the other two exist only because the bilan asked.
export type ItemOutcome = 'sold_out' | 'did_well' | 'did_not_do_well';

// No time, unlike the availability pair. Theirs means *what time it is at the market, right
// now* (decision 35), which held while a bilan could only be recorded on the day itself —
// but decision 69 lets a vendor judge Saturday's market on Sunday morning, and a 09:15
// stamped onto Saturday's stream would read as mid-market and be false. The store times
// every event it stores, so when the vendor said it is recorded either way.
export type ItemOutcomeRecorded = DomainEvent<'ItemOutcomeRecorded', {
  itemId: string,
  outcome: ItemOutcome,
  marketId: string,
  date: string
}>
