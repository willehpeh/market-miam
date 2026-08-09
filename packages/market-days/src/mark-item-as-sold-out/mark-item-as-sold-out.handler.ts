import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { MarkItemAsSoldOut } from './mark-item-as-sold-out';
import { MarketDayId, MarketDays } from '../market-day';
import { ItemId } from '../catalogue';
import { MarketId, VendorId } from '@market-miam/shared-kernel';
import { LocalDate, LocalTime } from '@market-miam/common';

@CommandHandler(MarkItemAsSoldOut)
export class MarkItemAsSoldOutHandler implements ICommandHandler<MarkItemAsSoldOut> {

  constructor(private readonly marketDays: MarketDays) {}

  async execute(command: MarkItemAsSoldOut): Promise<void> {
    const vendorId = new VendorId(command.vendorId);
    const id = new MarketDayId(new MarketId(command.marketId), new LocalDate(command.date));
    const itemId = new ItemId(command.itemId);

    const marketDay = await this.marketDays.forVendorAtMarketOn(vendorId, id);
    marketDay.markItemAsSoldOut(itemId, new LocalTime(command.time));

    await this.marketDays.save(marketDay, vendorId, id);
  }
}
