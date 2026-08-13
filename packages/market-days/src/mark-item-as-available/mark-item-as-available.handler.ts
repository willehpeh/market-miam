import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { MarkItemAsAvailable } from './mark-item-as-available';
import { MarketDayId, MarketDays } from '../market-day';
import { ItemId } from '../catalogue';
import { MarketId, VendorId } from '@market-miam/shared-kernel';
import { Clock, LocalDate } from '@market-miam/common';
import { parisTime } from '../market-schedule-view';

@CommandHandler(MarkItemAsAvailable)
export class MarkItemAsAvailableHandler implements ICommandHandler<MarkItemAsAvailable> {

  constructor(private readonly marketDays: MarketDays,
              private readonly clock: Clock) {}

  async execute(command: MarkItemAsAvailable): Promise<void> {
    const vendorId = new VendorId(command.vendorId);
    const id = new MarketDayId(new MarketId(command.marketId), new LocalDate(command.date));
    const itemId = new ItemId(command.itemId);

    const marketDay = await this.marketDays.forVendorAtMarketOn(vendorId, id);
    marketDay.markItemAsAvailable(itemId, parisTime(this.clock.now()));

    await this.marketDays.save(marketDay, vendorId, id);
  }
}
