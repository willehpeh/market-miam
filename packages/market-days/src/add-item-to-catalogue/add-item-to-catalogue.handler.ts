import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ImageReference } from '@market-miam/common';
import { VendorId } from '@market-miam/shared-kernel';
import { AddItemToCatalogue } from './add-item-to-catalogue';
import { Catalogues, ItemDescription, ItemId, ItemName, Pricing } from '../catalogue';

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
      pricing: Pricing.from({ price: request.price, variants: request.variants }),
      imageReference: request.imageReference ? new ImageReference(request.imageReference) : undefined,
    });

    await this.catalogues.save(catalogue, vendorId);
  }
}
