import { ItemAddedToCatalogue, ItemRetired, ItemRevised, ItemPhotoChanged, ItemsReordered, CatalogueEvent } from './events';
import { Aggregate } from '@market-miam/event-sourcing';
import { ImageReference } from '@market-miam/common';
import { Item, ItemDescription, ItemId, ItemName, Pricing } from './item';
import { NoSuchItemError } from './errors/no-such-item.error';
import { ItemAlreadyInCatalogueError } from './errors/item-already-in-catalogue.error';
import { IncompleteReorderError } from './errors/incomplete-reorder.error';

export class Catalogue extends Aggregate {

  private _items: Item[] = [];

  addItem(item: { id: ItemId, name: ItemName, description: ItemDescription, pricing: Pricing, imageReference?: ImageReference }) {
    if (this.hasItem(item.id)) {
      throw new ItemAlreadyInCatalogueError(`Item already in catalogue with ID ${ item.id.value() }`);
    }
    const event: ItemAddedToCatalogue = {
      type: 'ItemAddedToCatalogue',
      payload: {
        itemId: item.id.value(),
        name: item.name.value(),
        description: item.description.value(),
        ...item.pricing.value(),
        imageReference: item.imageReference?.value()
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
          Pricing.from(event.payload),
          event.payload.imageReference ? new ImageReference(event.payload.imageReference) : undefined
        ));
        break;
      case 'ItemRevised':
        this.itemWithId(new ItemId(event.payload.itemId)).revise(
          new ItemName(event.payload.name),
          new ItemDescription(event.payload.description),
          Pricing.from(event.payload)
        );
        break;
      case 'ItemPhotoChanged':
        this.itemWithId(new ItemId(event.payload.itemId))
          .changePhoto(new ImageReference(event.payload.imageReference));
        break;
      case 'ItemRetired':
        this._items = this._items.filter(item => !item.hasId(new ItemId(event.payload.itemId)));
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

  reviseItem(itemId: ItemId, name: ItemName, description: ItemDescription, pricing: Pricing) {
    this.assertHasItem(itemId);
    const event: ItemRevised = {
      type: 'ItemRevised',
      payload: {
        itemId: itemId.value(),
        name: name.value(),
        description: description.value(),
        ...pricing.value()
      },
      version: 1
    };
    this.raise(event);
  }

  changeItemPhoto(itemId: ItemId, imageReference: ImageReference) {
    this.assertHasItem(itemId);
    const event: ItemPhotoChanged = {
      type: 'ItemPhotoChanged',
      payload: {
        itemId: itemId.value(),
        imageReference: imageReference.value()
      },
      version: 1
    };
    this.raise(event);
  }

  reorderItems(itemIds: ItemId[]) {
    const coversEveryItem = itemIds.length === this._items.length
      && this._items.every(item => itemIds.some(itemId => item.hasId(itemId)));
    if (!coversEveryItem) {
      throw new IncompleteReorderError(`A new order must list each of the ${ this._items.length } items in the catalogue exactly once`);
    }
    const event: ItemsReordered = {
      type: 'ItemsReordered',
      payload: {
        itemIds: itemIds.map(itemId => itemId.value())
      },
      version: 1
    };
    this.raise(event);
  }

  // Retiring is idempotent: a catalogue forgets a retired item entirely, so a repeated
  // DELETE and one naming an id we never held are the same thing — nothing left to retire.
  retireItem(itemId: ItemId) {
    if (!this.hasItem(itemId)) {
      return;
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

  hasAtLeastOneItem(): boolean {
    return this._items.length > 0;
  }

  confirmAll(itemIds: ItemId[]): void {
    itemIds.forEach(itemId => this.assertHasItem(itemId));
  }

  private hasItem(itemId: ItemId): boolean {
    return this._items.some(item => item.hasId(itemId));
  }

  private assertHasItem(itemId: ItemId): void {
    if (!this.hasItem(itemId)) {
      throw new NoSuchItemError(`No item in catalogue with ID ${ itemId.value() }`);
    }
  }
}

