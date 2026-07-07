import { RetireItem } from '@market-miam/market-days';

export class TestRetireItem {
  static valid(): RetireItem {
    return new RetireItem(
      'vendor-id',
      'item-id',
    );
  }

  static with(overrides: Partial<RetireItem>): RetireItem {
    const defaults = this.valid();
    return new RetireItem(
      overrides.vendorId ?? defaults.vendorId,
      overrides.itemId ?? defaults.itemId,
    );
  }
}