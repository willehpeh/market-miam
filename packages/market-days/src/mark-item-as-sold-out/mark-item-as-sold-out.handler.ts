import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { MarkItemAsSoldOut } from './mark-item-as-sold-out';
import { MarketDays } from '../market-day';
import { ItemId } from '../catalogue';
import { MarketId, VendorId } from '@market-monster/shared-kernel';
import { LocalDate, LocalTime } from '@market-monster/common';

@CommandHandler(MarkItemAsSoldOut)
export class MarkItemAsSoldOutHandler implements ICommandHandler<MarkItemAsSoldOut> {

  constructor(private readonly marketDays: MarketDays) {}

  async execute(command: MarkItemAsSoldOut): Promise<void> {
    const { vendorId, marketId, date, time } = this.contextFrom(command);
    const itemId = new ItemId(command.itemId);

    const marketDay = await this.marketDays.forVendorAtMarket(vendorId, marketId).on(date);
    marketDay.markItemAsSoldOut(itemId, time);

    await this.marketDays.save(marketDay, vendorId);
  }

  private contextFrom(command: MarkItemAsSoldOut) {
    const vendorId = new VendorId(command.vendorId);
    const marketId = new MarketId(command.marketId);
    const date = new LocalDate(command.date);
    const time = new LocalTime(command.time);
    return { vendorId, marketId, date, time };
  }
}
