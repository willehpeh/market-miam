import { isDeepStrictEqual } from 'node:util';
import { describe, expect, it } from 'vitest';
import type { Query } from '@nestjs/cqrs';
import { QueryGateway } from '@market-miam/event-sourcing';
import { FindLiveMarketDay, LiveDish, LiveMarketDay } from '@market-miam/market-days';
import { Availability, OrderLine } from '@market-miam/ordering';
import { VendorId } from '@market-miam/shared-kernel';
import { MarketDaysTradingDays } from './market-days-trading-days';

const DATE = '2026-11-21';

class StubQueryGateway extends QueryGateway {
  constructor(private readonly liveDay?: LiveMarketDay) {
    super();
  }

  async execute<R>(query: Query<R>): Promise<R> {
    const asked = isDeepStrictEqual(query, new FindLiveMarketDay('vendor-1', 'market-1', DATE));
    return (asked ? this.liveDay : undefined) as R;
  }
}

const lines: OrderLine[] = [
  { dishId: 'dish-1', quantity: 2, unitPrice: 1250 },
  { dishId: 'dish-2', variant: 'Small', quantity: 1, unitPrice: 900 },
];

const dishOne: LiveDish = { itemId: 'dish-1', name: 'Dish one', price: 1250, soldOut: false };
const dishTwo: LiveDish = { itemId: 'dish-2', name: 'Dish two', variants: [{ name: 'Small', price: 900 }], soldOut: false };

const trading: LiveMarketDay = { dishes: [dishOne, dishTwo], closed: false, phase: 'trading' };

const tradingDayFor = (liveDay?: LiveMarketDay) =>
  new MarketDaysTradingDays(new StubQueryGateway(liveDay)).forVendorAtMarketOn(new VendorId('vendor-1'), 'market-1', DATE);

describe('Trading days, from Market Days’ live day', () => {
  it('takes an order on a trading day whose menu has its dishes', async () => {
    expect((await tradingDayFor(trading)).availabilityOf(lines)).toBe('available');
  });

  it.each<[Availability, string, Partial<LiveMarketDay>]>([
    ['not-yet-open', 'the day due to open', { phase: 'due' }],
    ['not-yet-open', 'the day still to come', { phase: 'future' }],
    ['ended', 'the day over', { phase: 'over' }],
    ['ended', 'the day past', { phase: 'past' }],
    ['closed', 'the day closed by hand', { closed: true }],
    ['sold-out', 'one of its dishes sold out', { dishes: [dishOne, { ...dishTwo, soldOut: true }] }],
  ])('refuses the order as %s when Market Days reports %s', async (availability, _, report) => {
    expect((await tradingDayFor({ ...trading, ...report })).availabilityOf(lines)).toBe(availability);
  });

  it('refuses the order as closed when Market Days reports no live day', async () => {
    expect((await tradingDayFor()).availabilityOf(lines)).toBe('closed');
  });
});
