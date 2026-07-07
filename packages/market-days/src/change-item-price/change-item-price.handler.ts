import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { VendorId } from '@market-miam/shared-kernel';
import { ChangeItemPrice } from './change-item-price';
import { Catalogues, ItemId, ItemPrice } from '../catalogue';

@CommandHandler(ChangeItemPrice)
export class ChangeItemPriceHandler implements ICommandHandler<ChangeItemPrice> {
  constructor(private readonly catalogues: Catalogues) {
  }

  async execute(command: ChangeItemPrice): Promise<void> {
    const vendorId = new VendorId(command.vendorId);
    const catalogue = await this.catalogues.forVendor(vendorId);
    catalogue.changeItemPrice(
      new ItemId(command.itemId),
      new ItemPrice(command.price),
    );
    await this.catalogues.save(catalogue, vendorId);
  }
}
