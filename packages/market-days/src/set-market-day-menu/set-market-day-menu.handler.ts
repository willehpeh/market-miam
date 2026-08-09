import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { MarketId, VendorId } from '@market-miam/shared-kernel';
import { LocalDate } from '@market-miam/common';
import { SetMarketDayMenu } from './set-market-day-menu';
import { MarketDayId, MarketDays, Menu } from '../market-day';
import { Catalogues, ItemId } from '../catalogue';

@CommandHandler(SetMarketDayMenu)
export class SetMarketDayMenuHandler implements ICommandHandler<SetMarketDayMenu> {

  constructor(private readonly marketDays: MarketDays,
              private readonly catalogues: Catalogues) {}

  async execute(command: SetMarketDayMenu): Promise<void> {
    const vendorId = new VendorId(command.vendorId);
    const marketDay = new MarketDayId(new MarketId(command.marketId), new LocalDate(command.date));
    const menu = await this.menuFor(vendorId, command.itemIds);

    const day = await this.marketDays.forVendorAtMarketOn(vendorId, marketDay);
    day.setMenu(menu);
    await this.marketDays.save(day, vendorId, marketDay);
  }

  private async menuFor(vendorId: VendorId, itemIds: string[]): Promise<Menu> {
    const catalogue = await this.catalogues.forVendor(vendorId);
    const ids = itemIds.map(itemId => new ItemId(itemId));
    catalogue.confirmAll(ids);
    return new Menu(ids);
  }
}
