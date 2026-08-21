import { Queryable } from '@market-miam/event-sourcing';
import { PriceList } from '../calendar';
import { MarketPricesView } from './market-prices-view';
import { MarketPricesViews } from './market-prices-views';
import { MarketPricesViewStore } from './market-prices-view.store';

type Row = { market_id: string; prices: PriceList };

export class PostgresMarketPricesViews implements MarketPricesViews, MarketPricesViewStore {
  constructor(private readonly db: Queryable) {}

  // Prefix scan on the primary key: vendor_id equality, then market_id, which the ORDER BY
  // is the tail of. One read serves a whole upcoming-days window.
  async forVendor(vendorId: string): Promise<MarketPricesView[]> {
    const { rows } = await this.db.query<Row>(
      `SELECT market_id, prices FROM market_prices_views
       WHERE vendor_id = $1
       ORDER BY market_id`,
      [vendorId],
    );
    return rows.map(row => ({ marketId: row.market_id, prices: row.prices }));
  }

  // Upsert of the whole list, never a merge: what the vendor last set whole is the row.
  async setPrices(prices: MarketPricesView, vendorId: string): Promise<void> {
    await this.db.query(
      `INSERT INTO market_prices_views (vendor_id, market_id, prices)
       VALUES ($1, $2, $3::jsonb)
       ON CONFLICT (vendor_id, market_id) DO UPDATE SET prices = EXCLUDED.prices`,
      [vendorId, prices.marketId, JSON.stringify(prices.prices)],
    );
  }

  async clear(): Promise<void> {
    await this.db.query('DELETE FROM market_prices_views');
  }
}
