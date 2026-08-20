import { DomainEvent } from '@market-miam/event-sourcing';

// How each dish sold, in the vendor's own judgment (decision 49). `sold_out` is the one the
// service log can prefill; the other two exist only because the bilan asked.
export type ItemOutcome = 'sold_out' | 'did_well' | 'did_not_do_well';

// The whole reckoning, replacing whatever stood before it — setMenu's shape, not the
// availability pair's (decisions 72, 73). No time: the store stamps every event it stores,
// and a bilan made on Sunday morning would otherwise claim a time on Saturday's market.
export type MarketDayBilanRecorded = DomainEvent<'MarketDayBilanRecorded', {
  outcomes: Record<string, ItemOutcome>,
  marketId: string,
  date: string
}>
