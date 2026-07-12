import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { VendorId } from '@market-miam/shared-kernel';
import { ImageReference } from '@market-miam/common';
import { ChangeItemPhoto } from './change-item-photo';
import { Catalogues, ItemId } from '../catalogue';

@CommandHandler(ChangeItemPhoto)
export class ChangeItemPhotoHandler implements ICommandHandler<ChangeItemPhoto> {
  constructor(private readonly catalogues: Catalogues) {
  }

  async execute(command: ChangeItemPhoto): Promise<void> {
    const vendorId = new VendorId(command.vendorId);
    const catalogue = await this.catalogues.forVendor(vendorId);
    catalogue.changeItemPhoto(
      new ItemId(command.itemId),
      new ImageReference(command.imageReference),
    );
    await this.catalogues.save(catalogue, vendorId);
  }
}
