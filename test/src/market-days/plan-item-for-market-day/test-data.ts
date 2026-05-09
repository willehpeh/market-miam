import { PlanItemForMarketDay } from './plan-item-for-market-day.spec';

export class TestPlanItemForMarketDay {
  static forItem(itemId: string): PlanItemForMarketDay {
    return {
      itemId,
      marketDayId: this.dateInFuture()
    };
  }
  static forItemWith(itemId: string, overrides: Partial<PlanItemForMarketDay>): PlanItemForMarketDay {
    const item = this.forItem(itemId);
    return { ...item, ...overrides };
  }

  private static dateInFuture(): string {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    return futureDate.toISOString().split('T')[0];
  }
}
