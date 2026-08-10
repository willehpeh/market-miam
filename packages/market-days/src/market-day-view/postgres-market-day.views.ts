import { Queryable } from '@market-miam/event-sourcing';
import { MarketDayView } from './market-day-view';
import { MarketDayViews } from './market-day-views';
import { MarketDayViewStore } from './market-day-view.store';

type Row = { market_id: string; day: string; item_ids: string[] };

export class PostgresMarketDayViews implements MarketDayViews, MarketDayViewStore {
  constructor(private readonly db: Queryable) {}

  // Prefix scan on the primary key (vendor_id, day, market_id) — 0013 ordered it for
  // exactly this read: vendor_id equality, then a range over day, which ISO dates sort
  // correctly as text; the ORDER BY is the tail of the same key.
  async menusFor(vendorId: string, from: string, to: string): Promise<MarketDayView[]> {
    const { rows } = await this.db.query<Row>(
      `SELECT market_id, day, item_ids FROM market_day_views
       WHERE vendor_id = $1 AND day BETWEEN $2 AND $3
       ORDER BY day, market_id`,
      [vendorId, from, to],
    );
    return rows.map(row => ({ marketId: row.market_id, date: row.day, itemIds: row.item_ids }));
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
