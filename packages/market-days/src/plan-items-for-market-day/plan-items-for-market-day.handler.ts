import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PlanItemsForMarketDay } from './plan-items-for-market-day';
import { MarketDays, PlannedItem, Quantity } from '../market-day';
import { Catalogues, ItemId } from '../catalogue';
import { MarketId, VendorId } from '@market-miam/shared-kernel';
import { LocalDate } from '@market-miam/common';

@CommandHandler(PlanItemsForMarketDay)
export class PlanItemsForMarketDayHandler implements ICommandHandler<PlanItemsForMarketDay> {

  constructor(private readonly marketDays: MarketDays,
              private readonly catalogues: Catalogues) {}

  async execute(request: PlanItemsForMarketDay): Promise<void> {
    const { vendorId, marketId, date } = this.contextFrom(request);

    const items = await this.plannedItemsFrom(request.items, vendorId);
    const marketDay = await this.marketDays.forVendorAtMarket(vendorId, marketId).on(date);
    marketDay.planItems(items);
    await this.marketDays.save(marketDay, vendorId);
  }

  private contextFrom(request: PlanItemsForMarketDay) {
    const vendorId = new VendorId(request.vendorId);
    const marketId = new MarketId(request.marketId);
    const date = new LocalDate(request.date);
    return { vendorId, marketId, date };
  }

  private async plannedItemsFrom(items: { itemId: string, quantity?: number }[], vendorId: VendorId) {
    const catalogue = await this.catalogues.forVendor(vendorId);
    return items.map(item => {
      const itemId = new ItemId(item.itemId);
      const catalogueItem = catalogue.itemWithId(itemId);
      const quantity = item.quantity === undefined ? undefined : new Quantity(item.quantity);
      return new PlannedItem(itemId, catalogueItem.name(), quantity);
    });
  }
}
