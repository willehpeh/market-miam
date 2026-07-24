import { AddItemToCatalogue, VariantInput } from '@market-miam/market-days';

export class TestAddItemToCatalogue {
  static valid(): AddItemToCatalogue {
    return new AddItemToCatalogue({
      itemId: 'item-id',
      vendorId: 'vendor-id',
      name: 'Item Name',
      description: 'Item Description',
      price: 500,
      imageReference: 'market-miam/items/item-photo',
    });
  }

  static with(overrides: Partial<AddItemToCatalogue>): AddItemToCatalogue {
    const defaults = this.valid();
    return new AddItemToCatalogue({
      itemId: overrides.itemId ?? defaults.itemId,
      vendorId: overrides.vendorId ?? defaults.vendorId,
      name: overrides.name ?? defaults.name,
      description: overrides.description ?? defaults.description,
      price: overrides.price ?? defaults.price,
      imageReference: overrides.imageReference ?? defaults.imageReference,
    });
  }

  static withVariants(variants: VariantInput[]): AddItemToCatalogue {
    return new AddItemToCatalogue({
      itemId: 'item-id',
      vendorId: 'vendor-id',
      name: 'Item Name',
      description: 'Item Description',
      imageReference: 'market-miam/items/item-photo',
      variants,
    });
  }
}
