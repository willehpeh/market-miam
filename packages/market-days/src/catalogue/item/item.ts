import { ItemId } from './item-id';
import { ItemName } from './item-name';
import { ItemDescription } from './item-description';
import { MarketPrice, Pricing } from './pricing';
import { ImageReference } from '@market-miam/common';
import { Allergens } from './allergens';

export class Item {
  constructor(
    private _itemId: ItemId,
    private _name: ItemName,
    private _description: ItemDescription,
    private _pricing: Pricing,
    // Undefined for an item added before allergens existed: undeclared, which is not "none".
    private _allergens: Allergens | undefined,
    private _imageReference?: ImageReference
  ) {
  }

  hasId(itemId: ItemId): boolean {
    return this._itemId.value() === itemId.value();
  }

  isDescribedAs(name: ItemName, description: ItemDescription, pricing: Pricing, allergens: Allergens): boolean {
    return this._name.value() === name.value()
      && this._description.value() === description.value()
      && this._pricing.equals(pricing)
      && (this._allergens?.equals(allergens) ?? false);
  }

  revise(name: ItemName, description: ItemDescription, pricing: Pricing, allergens: Allergens | undefined): void {
    this._name = name;
    this._description = description;
    this._pricing = pricing;
    this._allergens = allergens;
  }

  confirmPricedBy(price: MarketPrice): void {
    this._pricing.confirmMatchedBy(price);
  }

  changePhoto(imageReference: ImageReference): void {
    this._imageReference = imageReference;
  }
}
