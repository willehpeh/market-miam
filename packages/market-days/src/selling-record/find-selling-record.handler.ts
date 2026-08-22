import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Clock } from '@market-miam/common';
import { FindSellingRecord } from './find-selling-record';
import { Bilan, SellingRecordView } from './selling-record-view';
import { MarketDayViews } from '../market-day-view/market-day-views';

@QueryHandler(FindSellingRecord)
export class FindSellingRecordHandler implements IQueryHandler<FindSellingRecord> {
  // Six months of appearances rather than a fixed count: a weekly market offers ~26 to
  // choose from and a monthly one six, where a count would punish the infrequent market for
  // being infrequent. Here rather than in the aggregate for FindUnratedMarketDays' reason —
  // it is a UX rule the pilot is expected to move.
  private static readonly WINDOW_DAYS = 183;

  constructor(
    private readonly menus: MarketDayViews,
    private readonly clock: Clock,
  ) {}

  // No clock beyond the window, no schedule read and no catalogue join: a day carries
  // outcomes only if the aggregate already accepted a bilan for it, so a called-off day, a
  // day inside an absence and a day still trading all contribute nothing on their own.
  async execute(query: FindSellingRecord): Promise<SellingRecordView> {
    const today = this.clock.today();
    const from = today.plusDays(-FindSellingRecordHandler.WINDOW_DAYS);
    const days = await this.menus.menusFor(query.vendorId, from.value(), today.value());

    // menusFor answers ordered by day, so appending as we go leaves each dish's bilans
    // oldest first without a sort (decision 6).
    const byMarket = new Map<string, Map<string, Bilan[]>>();
    for (const day of days) {
      for (const [itemId, outcome] of Object.entries(day.outcomes)) {
        const items = byMarket.get(day.marketId) ?? new Map<string, Bilan[]>();
        byMarket.set(day.marketId, items);
        items.set(itemId, [...(items.get(itemId) ?? []), { date: day.date, outcome }]);
      }
    }

    return {
      markets: [...byMarket].map(([marketId, items]) => ({
        marketId,
        items: [...items].map(([itemId, bilans]) => ({ itemId, bilans })),
      })),
    };
  }
}
