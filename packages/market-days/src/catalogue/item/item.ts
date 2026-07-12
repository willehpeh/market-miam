import { ItemId } from './item-id';
import { ItemName } from './item-name';
import { ItemDescription } from './item-description';
import { ItemPrice } from './item-price';
import { ImageReference } from '@market-miam/common';

export class Item {
  constructor(
    private _itemId: ItemId,
    private _name: ItemName,
    private _description: ItemDescription,
    private _price: ItemPrice,
    private _imageReference?: ImageReference
  ) {
  }

  itemId(): ItemId {
    return this._itemId;
  }

  name(): ItemName {
    return this._name;
  }

  description(): ItemDescription {
    return this._description;
  }

  price(): ItemPrice {
    return this._price;
  }

  imageReference(): ImageReference | undefined {
    return this._imageReference;
  }

  hasId(itemId: ItemId): boolean {
    return this._itemId.value() === itemId.value();
  }

  changePrice(newPrice: ItemPrice): void {
    this._price = newPrice;
  }

  revise(name: ItemName, description: ItemDescription, price: ItemPrice): void {
    this._name = name;
    this._description = description;
    this._price = price;
  }
}
