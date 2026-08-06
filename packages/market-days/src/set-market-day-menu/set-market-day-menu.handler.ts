import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { MarketId, VendorId } from '@market-miam/shared-kernel';
import { LocalDate } from '@market-miam/common';
import { SetMarketDayMenu } from './set-market-day-menu';
import { MarketDays } from '../market-day';
import { Catalogues, ItemId } from '../catalogue';

@CommandHandler(SetMarketDayMenu)
export class SetMarketDayMenuHandler implements ICommandHandler<SetMarketDayMenu> {

  constructor(private readonly marketDays: MarketDays,
              private readonly catalogues: Catalogues) {}

  async execute(command: SetMarketDayMenu): Promise<void> {
    const vendorId = new VendorId(command.menu.vendorId);
    const marketId = new MarketId(command.menu.marketId);
    const date = new LocalDate(command.menu.date);
    const itemIds = command.menu.itemIds.map(itemId => new ItemId(itemId));

    const marketDay = await this.marketDays.forVendorAtMarket(vendorId, marketId).on(date);
    marketDay.setMenu(itemIds);
    await this.marketDays.save(marketDay, vendorId);
  }
}
