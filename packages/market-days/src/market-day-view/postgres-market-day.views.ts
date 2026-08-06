import { Queryable } from '@market-miam/event-sourcing';
import { MarketDayView } from './market-day-view';
import { MarketDayViews } from './market-day-views';
import { MarketDayViewStore } from './market-day-view.store';

type Row = { item_ids: string[] };

export class PostgresMarketDayViews implements MarketDayViews, MarketDayViewStore {
  constructor(private readonly db: Queryable) {}

  async menuFor(vendorId: string, marketId: string, date: string): Promise<MarketDayView> {
    const { rows } = await this.db.query<Row>(
      'SELECT item_ids FROM market_day_views WHERE vendor_id = $1 AND market_id = $2 AND day = $3',
      [vendorId, marketId, date],
    );
    return { marketId, date, itemIds: rows[0]?.item_ids ?? [] };
  }

  async setMenu(menu: MarketDayView, vendorId: string): Promise<void> {
    await this.db.query(
      `INSERT INTO market_day_views (vendor_id, market_id, day, item_ids)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (vendor_id, market_id, day) DO UPDATE SET item_ids = EXCLUDED.item_ids`,
      [vendorId, menu.marketId, menu.date, menu.itemIds],
    );
  }

  async clear(): Promise<void> {
    await this.db.query('DELETE FROM market_day_views');
  }
}
