import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Url } from '@market-monster/common';
import { VendorId } from '@market-monster/shared-kernel';
import { AddItemToRepertoire } from './add-item-to-repertoire';
import { ItemDescription, ItemId, ItemName, ItemPrice } from '../repertoire/item';
import { Repertoires } from '../repertoire/repertoires';

@CommandHandler(AddItemToRepertoire)
export class AddItemToRepertoireHandler implements ICommandHandler<AddItemToRepertoire> {
  constructor(private readonly repertoires: Repertoires) {
  }

  async execute(request: AddItemToRepertoire): Promise<void> {
    const vendorId = new VendorId(request.vendorId);
    const repertoire = await this.repertoires.forVendor(vendorId);
    repertoire.addItem(
      new ItemId(request.itemId),
      new ItemName(request.name),
      new ItemDescription(request.description),
      new ItemPrice(request.price),
      new Url(request.photoUrl),
    );

    await this.repertoires.save(repertoire, vendorId);
  }
}
