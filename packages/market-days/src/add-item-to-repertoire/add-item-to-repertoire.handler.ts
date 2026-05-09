import { Url } from '@market-monster/common';
import { AddItemToRepertoire } from './add-item-to-repertoire';
import { ItemDescription, ItemId, ItemName, ItemPrice } from '../repertoire/item';
import { Repertoires } from '../repertoire/repertoires';

export class AddItemToRepertoireHandler {
  constructor(private readonly repertoires: Repertoires) {
  }

  async handle(request: AddItemToRepertoire): Promise<void> {
    const repertoire = await this.repertoires.forVendor(request.vendorId);
    repertoire.addItem(
      new ItemId(request.itemId),
      new ItemName(request.name),
      new ItemDescription(request.description),
      new ItemPrice(request.price),
      new Url(request.photoUrl),
    );

    await this.repertoires.save(repertoire, request.vendorId);
  }
}
