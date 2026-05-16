import { PlanItemsForMarketDay, PlannedItem } from '@market-monster/market-days';

export class TestPlanItemsForMarketDay {
  static forItems(...items: PlannedItem[]): PlanItemsForMarketDay {
    return {
      vendorId: 'vendor-1',
      items,
      marketId: 'market-1',
      date: this.dateInFuture()
    };
  }
  static forItemsWith(items: PlannedItem[], overrides: Partial<PlanItemsForMarketDay>): PlanItemsForMarketDay {
    const command = this.forItems(...items);
    return { ...command, ...overrides };
  }

  private static dateInFuture(): string {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    return futureDate.toISOString().split('T')[0];
  }
}
