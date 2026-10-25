import {
  ItemMarkedAsAvailable,
  ItemMarkedAsSoldOut,
  ItemOutcome,
  MarketDayBilanRecorded,
  MarketDayClosed,
  MarketDayMenuSet,
  MarketDayReopened,
} from '@market-miam/market-days';

// The events a market-day spec seeds as its Given, typed against the domain's own event
// types so a payload that changes shape fails to compile here, in one place, rather than
// going stale in every spec that seeds it. Defaults match the harness: market-1, item-1,
// and 11:00 on the Paris wall clock. The event model reads each builder's event type from
// this file to list a slice's Given.
export const menuSet = (date: string, ...itemIds: string[]): MarketDayMenuSet =>
  ({ type: 'MarketDayMenuSet', payload: { itemIds, marketId: 'market-1', date }, version: 1 });

export const soldOut = (date: string, itemId = 'item-1', time = '11:00'): ItemMarkedAsSoldOut =>
  ({ type: 'ItemMarkedAsSoldOut', payload: { itemId, marketId: 'market-1', date, time }, version: 1 });

export const available = (date: string, itemId = 'item-1', time = '11:00'): ItemMarkedAsAvailable =>
  ({ type: 'ItemMarkedAsAvailable', payload: { itemId, marketId: 'market-1', date, time }, version: 1 });

export const closed = (date: string, time = '11:00'): MarketDayClosed =>
  ({ type: 'MarketDayClosed', payload: { marketId: 'market-1', date, time }, version: 1 });

export const reopened = (date: string, time = '11:00'): MarketDayReopened =>
  ({ type: 'MarketDayReopened', payload: { marketId: 'market-1', date, time }, version: 1 });

export const bilanRecorded = (date: string, outcomes: Record<string, ItemOutcome>): MarketDayBilanRecorded =>
  ({ type: 'MarketDayBilanRecorded', payload: { outcomes, marketId: 'market-1', date }, version: 1 });
