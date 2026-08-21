import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { VendorId } from '@market-miam/shared-kernel';
import { SetMarketPrices } from './set-market-prices';
import { Calendars, MarketPrices, PriceList } from '../calendar';
import { Catalogues } from '../catalogue';

@CommandHandler(SetMarketPrices)
export class SetMarketPricesHandler implements ICommandHandler<SetMarketPrices> {

  constructor(private readonly calendars: Calendars,
              private readonly catalogues: Catalogues) {
  }

  async execute(command: SetMarketPrices): Promise<void> {
    const vendorId = new VendorId(command.vendorId);
    const prices = await this.pricesFor(vendorId, command.prices);

    const calendar = await this.calendars.forVendor(vendorId);
    calendar.setMarketPrices(command.marketId, prices);
    await this.calendars.save(calendar, vendorId);
  }

  private async pricesFor(vendorId: VendorId, prices: PriceList): Promise<MarketPrices> {
    // Shape first, then the catalogue: a blank variant name is answered as a blank name,
    // not as a variant this dish happens not to have. Same order as menuFor's ItemId.
    const marketPrices = new MarketPrices(prices);

    const catalogue = await this.catalogues.forVendor(vendorId);
    catalogue.confirmPricing(marketPrices.byItem());
    return marketPrices;
  }
}
