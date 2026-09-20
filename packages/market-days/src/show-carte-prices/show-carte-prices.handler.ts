import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { VendorId } from '@market-miam/shared-kernel';
import { ShowCartePrices } from './show-carte-prices';
import { Storefronts } from '../storefront';

@CommandHandler(ShowCartePrices)
export class ShowCartePricesHandler implements ICommandHandler<ShowCartePrices> {
  constructor(private readonly storefronts: Storefronts) {
  }

  async execute(command: ShowCartePrices): Promise<void> {
    const vendorId = new VendorId(command.vendorId);
    const storefront = await this.storefronts.forVendor(vendorId);
    storefront.showCartePrices();
    await this.storefronts.save(storefront, vendorId);
  }
}
