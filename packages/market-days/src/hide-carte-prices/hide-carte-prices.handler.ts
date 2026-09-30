import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { VendorId } from '@market-miam/shared-kernel';
import { HideCartePrices } from './hide-carte-prices';
import { Storefronts } from '../storefront';

@CommandHandler(HideCartePrices)
export class HideCartePricesHandler implements ICommandHandler<HideCartePrices> {
  constructor(private readonly storefronts: Storefronts) {
  }

  async execute(command: HideCartePrices): Promise<void> {
    const vendorId = new VendorId(command.vendorId);
    const storefront = await this.storefronts.forVendor(vendorId);
    storefront.hideCartePrices();
    await this.storefronts.save(storefront, vendorId);
  }
}
