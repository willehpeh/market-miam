import { MarkItemAsSoldOut } from './mark-item-as-sold-out';
import { MarketDays } from '../market-day';
import { ItemId } from '../repertoire/item';
import { MarketId, VendorId } from '@market-monster/shared-kernel';
import { LocalDate, LocalTime } from '@market-monster/common';

export class MarkItemAsSoldOutHandler {

  constructor(private readonly marketDays: MarketDays) {}

  async handle(command: MarkItemAsSoldOut): Promise<void> {
    const vendorId = new VendorId(command.vendorId);
    const marketId = new MarketId(command.marketId);
    const date = new LocalDate(command.date);
    const itemId = new ItemId(command.itemId);
    const time = new LocalTime(command.time);

    const marketDay = await this.marketDays.forVendorAtMarket(vendorId, marketId).on(date);
    marketDay.markItemAsSoldOut(itemId, time);

    await this.marketDays.save(marketDay, vendorId);
  }
}
