import { PlanItemsForMarketDay } from './plan-items-for-market-day';
import { MarketDays } from '../market-day';
import { MarketId, VendorId } from '@market-monster/shared-kernel';

export class PlanItemsForMarketDayHandler {

  constructor(private readonly marketDays: MarketDays) {}

  async handle(planItemsForMarketDay: PlanItemsForMarketDay): Promise<void> {
    const { items, vendorId, marketId, date } = planItemsForMarketDay;
    const vendor = new VendorId(vendorId);
    const market = new MarketId(marketId);
    const marketDay = await this.marketDays.forVendorAtMarket(vendor, market).on(date);
    marketDay.planItems(items, marketId, date);
    await this.marketDays.save(marketDay, vendor, market, date);
  }
}
