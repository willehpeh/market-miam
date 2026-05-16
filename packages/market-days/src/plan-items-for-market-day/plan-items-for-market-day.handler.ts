import { PlanItemsForMarketDay } from './plan-items-for-market-day';
import { MarketDays } from '../market-day';
import { MarketId } from '@market-monster/shared-kernel';
import { EventStore } from '@market-monster/event-sourcing';

export class PlanItemsForMarketDayHandler {
  private readonly marketDays: MarketDays;

  constructor(store: EventStore) {
    this.marketDays = new MarketDays(store);
  }

  async handle(planItemsForMarketDay: PlanItemsForMarketDay): Promise<void> {
    const { items, marketId, date } = planItemsForMarketDay;
    const marketDay = await this.marketDays.forMarketOn(new MarketId(marketId), date);
    marketDay.planItems(items, marketId, date);
    await this.marketDays.save(marketDay, new MarketId(marketId), date);
  }
}
