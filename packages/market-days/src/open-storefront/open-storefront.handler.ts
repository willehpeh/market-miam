import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { VendorId } from '@market-monster/shared-kernel';
import { OpenStorefront } from './open-storefront';
import { Storefronts } from '../storefront';

@CommandHandler(OpenStorefront)
export class OpenStorefrontHandler implements ICommandHandler<OpenStorefront> {
  constructor(private readonly storefronts: Storefronts) {
  }

  async execute(command: OpenStorefront): Promise<void> {
    const vendorId = new VendorId(command.vendorId);
    const storefront = await this.storefronts.forVendor(vendorId);
    storefront.open(vendorId);
    await this.storefronts.save(storefront, vendorId);
  }
}
