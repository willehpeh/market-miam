import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PhoneNumber } from '@market-monster/common';
import { VendorId } from '@market-monster/shared-kernel';
import { EditStorefrontInformation } from './edit-storefront-information';
import { StorefrontDescription, StorefrontName, Storefronts } from '../storefront';

@CommandHandler(EditStorefrontInformation)
export class EditStorefrontInformationHandler implements ICommandHandler<EditStorefrontInformation> {
  constructor(private readonly storefronts: Storefronts) {
  }

  async execute(command: EditStorefrontInformation): Promise<void> {
    const vendorId = new VendorId(command.vendorId);
    const storefront = await this.storefronts.forVendor(vendorId);
    storefront.editInformation(
      new StorefrontName(command.name),
      new StorefrontDescription(command.description),
      new PhoneNumber(command.phone),
    );
    await this.storefronts.save(storefront, vendorId);
  }
}
