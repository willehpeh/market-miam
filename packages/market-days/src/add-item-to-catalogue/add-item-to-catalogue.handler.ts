import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ImageReference } from '@market-miam/common';
import { VendorId } from '@market-miam/shared-kernel';
import { AddItemToCatalogue } from './add-item-to-catalogue';
import { Catalogues, ItemDescription, ItemId, ItemName, ItemPrice, Variant } from '../catalogue';

@CommandHandler(AddItemToCatalogue)
export class AddItemToCatalogueHandler implements ICommandHandler<AddItemToCatalogue> {
  constructor(private readonly catalogues: Catalogues) {
  }

  async execute(request: AddItemToCatalogue): Promise<void> {
    const vendorId = new VendorId(request.vendorId);
    const catalogue = await this.catalogues.forVendor(vendorId);
    catalogue.addItem({
      id: new ItemId(request.itemId),
      name: new ItemName(request.name),
      description: new ItemDescription(request.description),
      price: request.price !== undefined ? new ItemPrice(request.price) : undefined,
      imageReference: request.imageReference ? new ImageReference(request.imageReference) : undefined,
      variants: request.variants?.map(variant => new Variant(variant.name, variant.description, variant.price)),
    });

    await this.catalogues.save(catalogue, vendorId);
  }
}
