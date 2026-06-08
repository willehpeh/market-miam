import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { VendorId } from '@market-monster/shared-kernel';
import { ChangeItemPrice } from './change-item-price';
import { Catalogues, ItemId, ItemPrice } from '../catalogue';

@CommandHandler(ChangeItemPrice)
export class ChangeItemPriceHandler implements ICommandHandler<ChangeItemPrice> {
  constructor(private readonly repertoires: Catalogues) {
  }

  async execute(command: ChangeItemPrice): Promise<void> {
    const vendorId = new VendorId(command.vendorId);
    const repertoire = await this.repertoires.forVendor(vendorId);
    repertoire.changeItemPrice(
      new ItemId(command.itemId),
      new ItemPrice(command.price),
    );
    await this.repertoires.save(repertoire, vendorId);
  }
}
