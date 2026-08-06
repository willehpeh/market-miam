import { ItemId } from '../catalogue';

export class Menu {
  private readonly _itemIds: ItemId[];

  constructor(itemIds: ItemId[]) {
    this._itemIds = itemIds.filter((itemId, index) =>
      itemIds.findIndex(candidate => candidate.equals(itemId)) === index);
  }

  includes(itemId: ItemId): boolean {
    return this._itemIds.some(candidate => candidate.equals(itemId));
  }

  equals(other: Menu): boolean {
    return this._itemIds.length === other._itemIds.length
      && this._itemIds.every(itemId => other.includes(itemId));
  }

  value(): string[] {
    return this._itemIds.map(itemId => itemId.value());
  }
}
