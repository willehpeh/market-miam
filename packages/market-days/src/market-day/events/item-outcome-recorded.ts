import { DomainEvent } from '@market-miam/event-sourcing';

// How a dish sold, in the vendor's own judgment (decision 49). `sold_out` is the one the
// service log can prefill; the other two exist only because the bilan asked.
export type ItemOutcome = 'sold_out' | 'did_well' | 'did_not_do_well';

export type ItemOutcomeRecorded = DomainEvent<'ItemOutcomeRecorded', {
  itemId: string,
  outcome: ItemOutcome,
  marketId: string,
  date: string,
  time: string
}>
