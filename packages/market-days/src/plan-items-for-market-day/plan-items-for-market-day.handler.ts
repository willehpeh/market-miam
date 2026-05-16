import { PlanItemsForMarketDay } from './plan-items-for-market-day';
import { MarketDays } from '../market-day';
import { MarketId, VendorId } from '@market-monster/shared-kernel';
import { LocalDate } from '@market-monster/common';

export class PlanItemsForMarketDayHandler {

  constructor(private readonly marketDays: MarketDays) {}

  async handle(request: PlanItemsForMarketDay): Promise<void> {
    const vendorId = new VendorId(request.vendorId);
    const marketId = new MarketId(request.marketId);
    const date = new LocalDate(request.date);
    const marketDay = await this.marketDays.forVendorAtMarket(vendorId, marketId).on(date);
    marketDay.planItems(request.items, marketId, date);
    await this.marketDays.save(marketDay, vendorId, marketId, date);
  }
}
