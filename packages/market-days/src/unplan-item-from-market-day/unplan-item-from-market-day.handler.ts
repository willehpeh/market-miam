import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UnplanItemFromMarketDay } from './unplan-item-from-market-day';
import { MarketDays } from '../market-day';
import { ItemId } from '../catalogue';
import { MarketId, VendorId } from '@market-monster/shared-kernel';
import { LocalDate } from '@market-monster/common';

@CommandHandler(UnplanItemFromMarketDay)
export class UnplanItemFromMarketDayHandler implements ICommandHandler<UnplanItemFromMarketDay> {

  constructor(private readonly marketDays: MarketDays) {}

  async execute(command: UnplanItemFromMarketDay): Promise<void> {
    const { vendorId, marketId, date } = this.contextFrom(command);
    const itemId = new ItemId(command.itemId);

    const marketDay = await this.marketDays.forVendorAtMarket(vendorId, marketId).on(date);
    marketDay.unplanItem(itemId);

    await this.marketDays.save(marketDay, vendorId);
  }

  private contextFrom(command: UnplanItemFromMarketDay) {
    const vendorId = new VendorId(command.vendorId);
    const marketId = new MarketId(command.marketId);
    const date = new LocalDate(command.date);
    return { vendorId, marketId, date };
  }
}
