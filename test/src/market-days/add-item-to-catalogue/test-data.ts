import { AddItemToCatalogue } from '@market-monster/market-days';

export class TestAddItemToCatalogue {
  static valid(): AddItemToCatalogue {
    return new AddItemToCatalogue(
      'item-id',
      'vendor-id',
      'Item Name',
      'Item Description',
      500,
      'https://example.com/item-photo.jpg',
    );
  }

  static with(overrides: Partial<AddItemToCatalogue>): AddItemToCatalogue {
    const defaults = this.valid();
    return new AddItemToCatalogue(
      overrides.itemId ?? defaults.itemId,
      overrides.vendorId ?? defaults.vendorId,
      overrides.name ?? defaults.name,
      overrides.description ?? defaults.description,
      overrides.price ?? defaults.price,
      overrides.photoUrl ?? defaults.photoUrl,
    );
  }
}
