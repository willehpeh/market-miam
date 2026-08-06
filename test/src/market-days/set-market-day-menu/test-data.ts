import { SetMarketDayMenu } from '@market-miam/market-days';

export const LAST_SATURDAY = '2026-06-13';
export const TODAY = '2026-06-19';
export const SATURDAY = '2026-06-20';

export class TestSetMarketDayMenu {
  static valid(): SetMarketDayMenu {
    return new SetMarketDayMenu({
      vendorId: 'vendor-1',
      itemIds: ['item-1', 'item-2'],
      marketId: 'market-1',
      date: SATURDAY,
    });
  }

  static with(overrides: Partial<SetMarketDayMenu>): SetMarketDayMenu {
    const defaults = this.valid();
    return new SetMarketDayMenu({
      vendorId: overrides.vendorId ?? defaults.vendorId,
      itemIds: overrides.itemIds ?? defaults.itemIds,
      marketId: overrides.marketId ?? defaults.marketId,
      date: overrides.date ?? defaults.date,
    });
  }
}
