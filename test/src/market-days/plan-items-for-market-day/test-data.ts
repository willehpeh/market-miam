import { PlanItemsForMarketDay } from '@market-monster/market-days';

export class TestPlanItemsForMarketDay {
  static withDefaults(): PlanItemsForMarketDay {
    return this.forItems(
      { itemId: 'item-1', quantity: 10 },
      { itemId: 'item-2' },
      { itemId: 'item-3', quantity: 5 },
    );
  }

  static forItems(...items: { itemId: string; quantity?: number }[]): PlanItemsForMarketDay {
    return {
      vendorId: 'vendor-1',
      items,
      marketId: 'market-1',
      date: this.dateInFuture()
    };
  }
  static forItemsWith(items: { itemId: string; quantity?: number }[], overrides: Partial<PlanItemsForMarketDay>): PlanItemsForMarketDay {
    const command = this.forItems(...items);
    return { ...command, ...overrides };
  }

  private static dateInFuture(): string {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    return futureDate.toISOString().split('T')[0];
  }
}
