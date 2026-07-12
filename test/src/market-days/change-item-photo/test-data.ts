import { ChangeItemPhoto } from '@market-miam/market-days';

export class TestChangeItemPhoto {
  static valid(): ChangeItemPhoto {
    return new ChangeItemPhoto(
      'item-id',
      'vendor-id',
      'v2/dishes/vendor-id/item-id',
    );
  }

  static with(overrides: Partial<ChangeItemPhoto>): ChangeItemPhoto {
    const defaults = this.valid();
    return new ChangeItemPhoto(
      overrides.itemId ?? defaults.itemId,
      overrides.vendorId ?? defaults.vendorId,
      overrides.imageReference ?? defaults.imageReference,
    );
  }
}
