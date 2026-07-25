import { ItemAddedToCatalogue, ItemRetired, ItemRevised, ItemPhotoChanged, CatalogueEvent } from './events';
import { Aggregate } from '@market-miam/event-sourcing';
import { ImageReference } from '@market-miam/common';
import { Item, ItemDescription, ItemId, ItemName, ItemPrice, Variant, Variants } from './item';
import { NoSuchItemError } from './errors/no-such-item.error';
import { ItemAlreadyInCatalogueError } from './errors/item-already-in-catalogue.error';
import { InvalidDishPricingError } from './errors/invalid-dish-pricing.error';

export class Catalogue extends Aggregate {

  private _items: Item[] = [];

  addItem(item: { id: ItemId, name: ItemName, description: ItemDescription, price?: ItemPrice, imageReference?: ImageReference, variants?: Variants }) {
    if (this.hasItem(item.id)) {
      throw new ItemAlreadyInCatalogueError(`Item already in catalogue with ID ${ item.id.value() }`);
    }
    const hasPrice = item.price !== undefined;
    const hasVariants = item.variants !== undefined;
    if (hasPrice === hasVariants) {
      throw new InvalidDishPricingError(hasPrice
        ? 'A dish cannot have both a price and variants'
        : 'A dish must have either a price or variants');
    }
    const event: ItemAddedToCatalogue = {
      type: 'ItemAddedToCatalogue',
      payload: {
        itemId: item.id.value(),
        name: item.name.value(),
        description: item.description.value(),
        ...(item.variants
          ? { variants: item.variants.value() }
          : { price: item.price!.value() }),
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
          event.payload.variants ? undefined : new ItemPrice(event.payload.price!),
          event.payload.imageReference ? new ImageReference(event.payload.imageReference) : undefined,
          event.payload.variants ? new Variants(event.payload.variants.map(variant => new Variant(variant.name, variant.description, variant.price))) : undefined
        ));
        break;
      case 'ItemRevised':
        this.itemWithId(new ItemId(event.payload.itemId)).revise(
          new ItemName(event.payload.name),
          new ItemDescription(event.payload.description),
          new ItemPrice(event.payload.price)
        );
        break;
      case 'ItemPhotoChanged':
        this.itemWithId(new ItemId(event.payload.itemId))
          .changePhoto(new ImageReference(event.payload.imageReference));
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

  reviseItem(itemId: ItemId, name: ItemName, description: ItemDescription, price: ItemPrice) {
    this.assertHasItem(itemId);
    const event: ItemRevised = {
      type: 'ItemRevised',
      payload: {
        itemId: itemId.value(),
        name: name.value(),
        description: description.value(),
        price: price.value()
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

  retireItem(itemId: ItemId) {
    this.assertHasItem(itemId);
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
    // ponytail: apply() ignores ItemRetired, so retired items stay in _items and
    // an all-retired catalogue still reads non-empty. Make retirement-aware (apply
    // ItemRetired) if publishing an empty menu becomes a real problem.
    return this._items.length > 0;
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

