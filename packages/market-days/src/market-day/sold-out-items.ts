import { ItemId } from '../catalogue';
import { Menu } from './menu';

export class SoldOutItems {
  constructor(private readonly _itemIds: ItemId[] = []) {}

  with(itemId: ItemId): SoldOutItems {
    return new SoldOutItems([...this._itemIds, itemId]);
  }

  without(itemId: ItemId): SoldOutItems {
    return new SoldOutItems(this._itemIds.filter(id => !id.equals(itemId)));
  }

  keptBy(menu: Menu): SoldOutItems {
    return new SoldOutItems(this._itemIds.filter(id => menu.includes(id)));
  }

  includes(itemId: ItemId): boolean {
    return this._itemIds.some(id => id.equals(itemId));
  }
}
