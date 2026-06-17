import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { VendorId } from '@market-monster/shared-kernel';
import { ImageReference } from '@market-monster/common';
import { SetStorefrontCoverPhoto } from './set-storefront-cover-photo';
import { Storefronts } from '../storefront';

@CommandHandler(SetStorefrontCoverPhoto)
export class SetStorefrontCoverPhotoHandler implements ICommandHandler<SetStorefrontCoverPhoto> {
  constructor(private readonly storefronts: Storefronts) {
  }

  async execute(command: SetStorefrontCoverPhoto): Promise<void> {
    const vendorId = new VendorId(command.vendorId);
    const storefront = await this.storefronts.forVendor(vendorId);
    storefront.setCoverPhoto(new ImageReference(command.imageReference));
    await this.storefronts.save(storefront, vendorId);
  }
}
