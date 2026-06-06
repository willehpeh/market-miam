import { ItemAddedToRepertoire, ItemPriceChanged, RepertoireEvent } from './events';
import { Aggregate } from '@market-monster/event-sourcing';
import { Url } from '@market-monster/common';
import { ItemDescription, ItemId, ItemName, ItemPrice } from './item';
import { NoSuchItemError } from './no-such-item.error';

class Item {
  constructor(
    private _itemId: ItemId,
    private _name: ItemName,
    private _description: ItemDescription,
    private _price: ItemPrice,
    private _photoUrl: Url
  ) {}

  hasId(itemId: ItemId): boolean {
    return this._itemId.value() === itemId.value();
  }

  changePrice(newPrice: ItemPrice) {
    this._price = newPrice;
  }
}

export class Repertoire extends Aggregate {

  private _items: Item[] = [];

  addItem(id: ItemId, name: ItemName, description: ItemDescription, price: ItemPrice, photoUrl: Url) {
    const event: ItemAddedToRepertoire = {
      type: 'ItemAddedToRepertoire',
      payload: {
        itemId: id.value(),
        name: name.value(),
        description: description.value(),
        price: price.value(),
        photoUrl: photoUrl.value(),
      },
    };
    this.raise(event);
  }

  apply(event: RepertoireEvent): void {
    switch (event.type) {
      case 'ItemAddedToRepertoire':
        this._items.push(new Item(
          new ItemId(event.payload.itemId),
          new ItemName(event.payload.name),
          new ItemDescription(event.payload.description),
          new ItemPrice(event.payload.price),
          new Url(event.payload.photoUrl)
        ));
        break;
    }
  }

  changeItemPrice(itemId: ItemId, itemPrice: ItemPrice) {
    const item = this._items.find(item => item.hasId(itemId));
    if (!item) {
      throw new NoSuchItemError(`No item in repertoire with ID ${itemId.value()}`);
    }
    item.changePrice(itemPrice);
    const event: ItemPriceChanged = {
      type: 'ItemPriceChanged',
      payload: {
        itemId: itemId.value(),
        price: itemPrice.value(),
      },
    };
    this.raise(event);
  }
}
