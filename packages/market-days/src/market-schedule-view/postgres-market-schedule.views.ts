import { Queryable } from '@market-miam/event-sourcing';
import { MarketScheduleView, MarketSchedulesView } from './market-schedule-view';
import { MarketScheduleViews } from './market-schedule-views';
import { MarketScheduleViewStore } from './market-schedule-view.store';

// ponytail: the whole view snapshot is one jsonb column, unlike catalogue's flat scalar
// columns. The view is echoed verbatim (incl. optionals omitted when absent), so a single
// jsonb round-trips exactly and matches the in-memory adapter's contract without a
// null→omit-key rebuild. Flatten into columns if the schedule ever needs to be queried by
// an inner field.
type Row = { schedule: MarketScheduleView };

export class PostgresMarketScheduleViews implements MarketScheduleViews, MarketScheduleViewStore {
  constructor(private readonly db: Queryable) {}

  async forVendor(vendorId: string): Promise<MarketSchedulesView> {
    const { rows } = await this.db.query<Row>(
      'SELECT schedule FROM market_schedule_views WHERE vendor_id = $1 ORDER BY seq',
      [vendorId],
    );
    return { schedules: rows.map(row => row.schedule) };
  }

  async recordSchedule(schedule: MarketScheduleView, vendorId: string): Promise<void> {
    await this.db.query(
      `INSERT INTO market_schedule_views (vendor_id, schedule_id, schedule)
       VALUES ($1, $2, $3)
       ON CONFLICT (vendor_id, schedule_id) DO UPDATE SET schedule = EXCLUDED.schedule`,
      [vendorId, schedule.scheduleId, JSON.stringify(schedule)],
    );
  }

  async amendSchedule(schedule: MarketScheduleView, vendorId: string): Promise<void> {
    await this.db.query(
      `UPDATE market_schedule_views SET schedule = schedule || $3::jsonb
       WHERE vendor_id = $1 AND schedule_id = $2`,
      [vendorId, schedule.scheduleId, JSON.stringify(schedule)],
    );
  }

  async cancelSchedule(scheduleId: string, vendorId: string): Promise<void> {
    await this.db.query(
      'DELETE FROM market_schedule_views WHERE vendor_id = $1 AND schedule_id = $2',
      [vendorId, scheduleId],
    );
  }

  async recordAbsence(scheduleId: string, vendorId: string, range: { from: string; to: string }): Promise<void> {
    await this.db.query(
      `UPDATE market_schedule_views
       SET schedule = jsonb_set(schedule, '{absences}', COALESCE(schedule->'absences', '[]'::jsonb) || $3::jsonb, true)
       WHERE vendor_id = $1 AND schedule_id = $2`,
      [vendorId, scheduleId, JSON.stringify([range])],
    );
  }

  async clear(): Promise<void> {
    await this.db.query('DELETE FROM market_schedule_views');
  }
}
