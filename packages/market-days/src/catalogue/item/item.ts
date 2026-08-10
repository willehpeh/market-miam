import { ItemId } from './item-id';
import { ItemName } from './item-name';
import { ItemDescription } from './item-description';
import { Pricing } from './pricing';
import { ImageReference } from '@market-miam/common';

export class Item {
  constructor(
    private _itemId: ItemId,
    private _name: ItemName,
    private _description: ItemDescription,
    private _pricing: Pricing,
    private _imageReference?: ImageReference
  ) {
  }

  hasId(itemId: ItemId): boolean {
    return this._itemId.value() === itemId.value();
  }

  revise(name: ItemName, description: ItemDescription, pricing: Pricing): void {
    this._name = name;
    this._description = description;
    this._pricing = pricing;
  }

  changePhoto(imageReference: ImageReference): void {
    this._imageReference = imageReference;
  }
}
