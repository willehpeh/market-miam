import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { VendorId } from '@market-miam/shared-kernel';
import { ReorderItems } from './reorder-items';
import { Catalogues, ItemId } from '../catalogue';

@CommandHandler(ReorderItems)
export class ReorderItemsHandler implements ICommandHandler<ReorderItems> {
  constructor(private readonly catalogues: Catalogues) {
  }

  async execute(command: ReorderItems): Promise<void> {
    const vendorId = new VendorId(command.vendorId);
    const catalogue = await this.catalogues.forVendor(vendorId);
    catalogue.reorderItems(command.itemIds.map(itemId => new ItemId(itemId)));
    await this.catalogues.save(catalogue, vendorId);
  }
}
