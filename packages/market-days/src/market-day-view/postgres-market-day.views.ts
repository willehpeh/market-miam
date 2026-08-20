import { Queryable } from '@market-miam/event-sourcing';
import { ItemOutcome } from '../market-day/events';
import { AvailabilityMark, MarketDayMenu, MarketDayRef, MarketDayView, OutcomeMark } from './market-day-view';
import { MarketDayViews } from './market-day-views';
import { MarketDayViewStore } from './market-day-view.store';

type Row = { market_id: string; day: string; item_ids: string[]; sold_out: string[]; outcomes: Record<string, ItemOutcome>; closed: boolean };

export class PostgresMarketDayViews implements MarketDayViews, MarketDayViewStore {
  constructor(private readonly db: Queryable) {}

  // Prefix scan on the primary key (vendor_id, day, market_id) — 0013 ordered it for
  // exactly this read: vendor_id equality, then a range over day, which ISO dates sort
  // correctly as text; the ORDER BY is the tail of the same key.
  async menusFor(vendorId: string, from: string, to: string): Promise<MarketDayView[]> {
    const { rows } = await this.db.query<Row>(
      `SELECT market_id, day, item_ids, sold_out, outcomes, closed FROM market_day_views
       WHERE vendor_id = $1 AND day BETWEEN $2 AND $3
       ORDER BY day, market_id`,
      [vendorId, from, to],
    );
    return rows.map(row => ({
      marketId: row.market_id,
      date: row.day,
      itemIds: row.item_ids,
      soldOutItemIds: row.sold_out,
      outcomes: row.outcomes,
      closed: row.closed,
    }));
  }

  // The intersection keeps sold_out's own order, mirroring market-day.ts:24 — INTERSECT
  // would surrender it to the planner.
  async setMenu(menu: MarketDayMenu, vendorId: string): Promise<void> {
    await this.db.query(
      `INSERT INTO market_day_views (vendor_id, market_id, day, item_ids, sold_out)
       VALUES ($1, $2, $3, $4, '{}')
       ON CONFLICT (vendor_id, market_id, day) DO UPDATE SET
         item_ids = EXCLUDED.item_ids,
         sold_out = ARRAY(SELECT id FROM unnest(market_day_views.sold_out) AS id WHERE id = ANY(EXCLUDED.item_ids)),
         outcomes = COALESCE((SELECT jsonb_object_agg(key, value)
                              FROM jsonb_each(market_day_views.outcomes)
                              WHERE key = ANY(EXCLUDED.item_ids)), '{}'::jsonb)`,
      [vendorId, menu.marketId, menu.date, menu.itemIds],
    );
  }

  // UPDATE, not upsert: a mark for a day nobody planned lands on no row, which is the
  // contract's answer — staying absent beats inventing a row with no menu.
  async markSoldOut(mark: AvailabilityMark, vendorId: string): Promise<void> {
    await this.db.query(
      `UPDATE market_day_views SET sold_out = array_append(sold_out, $4)
       WHERE vendor_id = $1 AND market_id = $2 AND day = $3`,
      [vendorId, mark.marketId, mark.date, mark.itemId],
    );
  }

  async markAvailable(mark: AvailabilityMark, vendorId: string): Promise<void> {
    await this.db.query(
      `UPDATE market_day_views SET sold_out = array_remove(sold_out, $4)
       WHERE vendor_id = $1 AND market_id = $2 AND day = $3`,
      [vendorId, mark.marketId, mark.date, mark.itemId],
    );
  }

  // UPDATE like the availability marks, and for the same reason: the aggregate refuses an
  // outcome for an item the menu never planned, so a mark with no row is only ever a replay
  // arriving out of order.
  async recordOutcome(mark: OutcomeMark, vendorId: string): Promise<void> {
    await this.db.query(
      `UPDATE market_day_views SET outcomes = outcomes || jsonb_build_object($4::text, $5::text)
       WHERE vendor_id = $1 AND market_id = $2 AND day = $3`,
      [vendorId, mark.marketId, mark.date, mark.itemId, mark.outcome],
    );
  }

  // Upsert, unlike the availability marks: closing a day nobody planned is a real thing a
  // vendor does — the *je ne peux pas venir* door — so the row starts here, menu-less. The
  // menu columns are left alone on conflict, so a close never disturbs a planned day.
  async close(day: MarketDayRef, vendorId: string): Promise<void> {
    await this.db.query(
      `INSERT INTO market_day_views (vendor_id, market_id, day, item_ids, sold_out, closed)
       VALUES ($1, $2, $3, '{}', '{}', true)
       ON CONFLICT (vendor_id, market_id, day) DO UPDATE SET closed = true`,
      [vendorId, day.marketId, day.date],
    );
  }

  // UPDATE, not upsert: nothing can be reopened that was never closed, so a reopen with no
  // row is only ever a replay reaching it out of order.
  async reopen(day: MarketDayRef, vendorId: string): Promise<void> {
    await this.db.query(
      `UPDATE market_day_views SET closed = false, outcomes = '{}'::jsonb
       WHERE vendor_id = $1 AND market_id = $2 AND day = $3`,
      [vendorId, day.marketId, day.date],
    );
  }

  async clear(): Promise<void> {
    await this.db.query('DELETE FROM market_day_views');
  }
}
