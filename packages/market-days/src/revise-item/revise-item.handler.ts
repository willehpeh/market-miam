import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { VendorId } from '@market-miam/shared-kernel';
import { ReviseItem } from './revise-item';
import { Catalogues, ItemDescription, ItemId, ItemName, ItemPrice, Variants } from '../catalogue';

@CommandHandler(ReviseItem)
export class ReviseItemHandler implements ICommandHandler<ReviseItem> {
  constructor(private readonly catalogues: Catalogues) {
  }

  async execute(command: ReviseItem): Promise<void> {
    const vendorId = new VendorId(command.vendorId);
    const catalogue = await this.catalogues.forVendor(vendorId);
    catalogue.reviseItem(
      new ItemId(command.itemId),
      new ItemName(command.name),
      new ItemDescription(command.description),
      command.price !== undefined ? new ItemPrice(command.price) : undefined,
      command.variants ? Variants.fromInputs(command.variants) : undefined,
    );
    await this.catalogues.save(catalogue, vendorId);
  }
}
