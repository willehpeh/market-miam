import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { MarkItemAsSoldOut } from './mark-item-as-sold-out';
import { MarketDayId, MarketDays } from '../market-day';
import { ItemId } from '../catalogue';
import { MarketId, VendorId } from '@market-miam/shared-kernel';
import { Clock, LocalDate } from '@market-miam/common';
import { parisWallClock } from '../market-schedule-view';

@CommandHandler(MarkItemAsSoldOut)
export class MarkItemAsSoldOutHandler implements ICommandHandler<MarkItemAsSoldOut> {

  constructor(private readonly marketDays: MarketDays,
              private readonly clock: Clock) {}

  async execute(command: MarkItemAsSoldOut): Promise<void> {
    const vendorId = new VendorId(command.vendorId);
    const id = new MarketDayId(new MarketId(command.marketId), new LocalDate(command.date));
    const itemId = new ItemId(command.itemId);

    const marketDay = await this.marketDays.forVendorAtMarketOn(vendorId, id);
    marketDay.markItemAsSoldOut(itemId, parisWallClock(this.clock.now()).time());

    await this.marketDays.save(marketDay, vendorId, id);
  }
}
