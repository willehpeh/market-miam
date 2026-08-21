import { DomainEvent } from 'packages/event-sourcing/src';

// What the vendor charges at one market, replacing whatever stood before it (ADR 0052) —
// setMarketDayMenu's shape, not an add/remove pair. Sparse throughout: an itemId absent
// here, or a variant name absent from an item's map, means the catalogue price.
export type MarketPricesSet = DomainEvent<'MarketPricesSet', {
  marketId: string;
  prices: Record<string, number | Record<string, number>>;
}>;
