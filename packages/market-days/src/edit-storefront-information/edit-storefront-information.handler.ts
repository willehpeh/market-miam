import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { VendorId } from '@market-monster/shared-kernel';
import { EditStorefrontInformation } from './edit-storefront-information';
import { Storefronts, StorefrontName, StorefrontDescription } from '../storefront';

@CommandHandler(EditStorefrontInformation)
export class EditStorefrontInformationHandler implements ICommandHandler<EditStorefrontInformation> {
  constructor(private readonly storefronts: Storefronts) {
  }

  async execute(command: EditStorefrontInformation): Promise<void> {
    const vendorId = new VendorId(command.vendorId);
    const storefront = await this.storefronts.forVendor(vendorId);
    storefront.editInformation(new StorefrontName(command.name), new StorefrontDescription(command.description));
    await this.storefronts.save(storefront, vendorId);
  }
}
