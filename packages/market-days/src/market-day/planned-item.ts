export class PlannedItem {
  private readonly _itemId: string;
  private readonly _quantity?: number;

  constructor(itemId: string, quantity?: number) {
    this._itemId = itemId;
    this._quantity = quantity;
  }

  itemId(): string {
    return this._itemId;
  }

  quantity(): number | undefined {
    return this._quantity;
  }
}
