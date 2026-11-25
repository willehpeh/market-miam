import { isDeepStrictEqual } from 'node:util';
import { describe, expect, it } from 'vitest';
import type { Query } from '@nestjs/cqrs';
import { QueryGateway } from '@market-miam/event-sourcing';
import { FindLiveMarketDay, LiveMarketDay } from '@market-miam/market-days';
import { OrderLine } from '@market-miam/ordering';
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

const trading: LiveMarketDay = { itemIds: ['dish-1', 'dish-2'], soldOutItemIds: [], closed: false, phase: 'trading' };

const dayFrom = (liveDay?: LiveMarketDay) =>
  new MarketDaysTradingDays(new StubQueryGateway(liveDay)).forVendorAtMarketOn(new VendorId('vendor-1'), 'market-1', DATE);

describe('Trading days, from Market Days’ live day', () => {
  it('takes an order on a trading day whose menu has its dishes', async () => {
    expect((await dayFrom(trading)).availabilityOf(lines)).toBe('available');
  });
});
