import { PlanItemsForMarketDay } from './plan-items-for-market-day';
import { MarketDays, PlannedItem } from '../market-day';
import { MarketId, VendorId } from '@market-monster/shared-kernel';
import { LocalDate } from '@market-monster/common';

export class PlanItemsForMarketDayHandler {

  constructor(private readonly marketDays: MarketDays) {}

  async handle(request: PlanItemsForMarketDay): Promise<void> {
    const vendorId = new VendorId(request.vendorId);
    const marketId = new MarketId(request.marketId);
    const date = new LocalDate(request.date);
    const items = request.items.map(item => new PlannedItem(item.itemId, item.quantity));
    const marketDay = await this.marketDays.forVendorAtMarket(vendorId, marketId).on(date);
    marketDay.planItems(items);
    await this.marketDays.save(marketDay, vendorId);
  }
}
