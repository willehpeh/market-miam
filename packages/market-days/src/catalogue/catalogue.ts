import { ItemAddedToCatalogue, ItemPriceChanged, ItemRetired, ItemRevised, CatalogueEvent } from './events';
import { Aggregate } from '@market-miam/event-sourcing';
import { ImageReference } from '@market-miam/common';
import { Item, ItemDescription, ItemId, ItemName, ItemPrice } from './item';
import { NoSuchItemError } from './errors/no-such-item.error';
import { ItemAlreadyInCatalogueError } from './errors/item-already-in-catalogue.error';

export class Catalogue extends Aggregate {

  private _items: Item[] = [];

  addItem(id: ItemId, name: ItemName, description: ItemDescription, price: ItemPrice, imageReference?: ImageReference) {
    if (this.hasItem(id)) {
      throw new ItemAlreadyInCatalogueError(`Item already in catalogue with ID ${ id.value() }`);
    }
    const item = new Item(id, name, description, price, imageReference);
    const event: ItemAddedToCatalogue = {
      type: 'ItemAddedToCatalogue',
      payload: {
        itemId: item.itemId().value(),
        name: item.name().value(),
        description: item.description().value(),
        price: item.price().value(),
        imageReference: item.imageReference()?.value()
      },
      version: 1
    };
    this.raise(event);
  }

  apply(event: CatalogueEvent): void {
    switch (event.type) {
      case 'ItemAddedToCatalogue':
        this._items.push(new Item(
          new ItemId(event.payload.itemId),
          new ItemName(event.payload.name),
          new ItemDescription(event.payload.description),
          new ItemPrice(event.payload.price),
          event.payload.imageReference ? new ImageReference(event.payload.imageReference) : undefined
        ));
        break;
    }
  }

  itemWithId(itemId: ItemId): Item {
    const item = this._items.find(item => item.hasId(itemId));
    if (!item) {
      throw new NoSuchItemError(`No item in catalogue with ID ${ itemId.value() }`);
    }
    return item;
  }

  changeItemPrice(itemId: ItemId, itemPrice: ItemPrice) {
    const item = this.itemWithId(itemId);
    item.changePrice(itemPrice);
    const event: ItemPriceChanged = {
      type: 'ItemPriceChanged',
      payload: {
        itemId: item.itemId().value(),
        price: item.price().value()
      },
      version: 1
    };
    this.raise(event);
  }

  reviseItem(itemId: ItemId, name: ItemName, description: ItemDescription, price: ItemPrice) {
    const item = this.itemWithId(itemId);
    item.revise(name, description, price);
    const event: ItemRevised = {
      type: 'ItemRevised',
      payload: {
        itemId: item.itemId().value(),
        name: item.name().value(),
        description: item.description().value(),
        price: item.price().value()
      },
      version: 1
    };
    this.raise(event);
  }

  retireItem(itemId: ItemId) {
    if (!this.hasItem(itemId)) {
      throw new NoSuchItemError(`No item in catalogue with ID ${ itemId.value() }`);
    }
    const event: ItemRetired = {
      type: 'ItemRetired',
      payload: {
        itemId: itemId.value()
      },
      version: 1
    };
    this.raise(event);
  }

  private hasItem(itemId: ItemId): boolean {
    return this._items.some(item => item.hasId(itemId));
  }
}

