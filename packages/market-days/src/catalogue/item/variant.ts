import { ItemDescription } from './item-description';
import { ItemName } from './item-name';
import { Price } from './price';

export class Variant {
  private readonly _name: ItemName;
  private readonly _description: ItemDescription;
  private readonly _price: Price;

  constructor(name: string, description: string, price: number) {
    this._name = new ItemName(name);
    this._description = new ItemDescription(description);
    this._price = new Price(price);
  }

  value(): { name: string; description: string; price: number } {
    return { name: this._name.value(), description: this._description.value(), price: this._price.value() };
  }
}
