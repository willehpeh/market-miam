import { ItemId, ItemName } from '../catalogue';
import { Quantity } from './quantity';

export class PlannedItem {
  private readonly _itemId: ItemId;
  private readonly _name: ItemName;
  private readonly _quantity?: Quantity;

  constructor(itemId: ItemId, name: ItemName, quantity?: Quantity) {
    this._itemId = itemId;
    this._name = name;
    this._quantity = quantity;
  }

  value(): { itemId: string, name: string, quantity?: number } {
    return {
      itemId: this._itemId.value(),
      name: this._name.value(),
      ...(this._quantity !== undefined && { quantity: this._quantity.value() })
    };
  }
}
