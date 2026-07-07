import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ImageReference } from '@market-miam/common';
import { VendorId } from '@market-miam/shared-kernel';
import { AddItemToCatalogue } from './add-item-to-catalogue';
import { Catalogues, ItemDescription, ItemId, ItemName, ItemPrice } from '../catalogue';

@CommandHandler(AddItemToCatalogue)
export class AddItemToCatalogueHandler implements ICommandHandler<AddItemToCatalogue> {
  constructor(private readonly catalogues: Catalogues) {
  }

  async execute(request: AddItemToCatalogue): Promise<void> {
    const vendorId = new VendorId(request.vendorId);
    const catalogue = await this.catalogues.forVendor(vendorId);
    catalogue.addItem(
      new ItemId(request.itemId),
      new ItemName(request.name),
      new ItemDescription(request.description),
      new ItemPrice(request.price),
      new ImageReference(request.imageReference),
    );

    await this.catalogues.save(catalogue, vendorId);
  }
}
