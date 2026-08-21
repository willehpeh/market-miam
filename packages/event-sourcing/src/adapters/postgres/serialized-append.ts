import type { PoolClient } from 'pg';
import { DomainEvent } from '../../domain/domain-event';
import { randomUUID } from 'node:crypto';
import { ConcurrencyError } from '../../domain/concurrency.error';

// ponytail: one global advisory lock serialises appends so global_position commits
// in order — monotonic commit order, which is all the single-bigint cursor needs
// (ADR 0028; rollbacks still burn identity values, so positions are not gap-free).
const APPEND_LOCK_KEY = 4_827_193;

// The append protocol — lock, concurrency check, one multi-row INSERT — runnable on
// any client inside any open transaction. Transaction lifecycle belongs to the
// caller: PostgresEventStore runs this through PostgresUnitOfWork.inTransaction,
// which joins an ambient transaction or owns a fresh one, so the lock
// (pg_advisory_xact_lock) scopes to whichever transaction this lands in.
export class SerializedAppend {

  constructor(private readonly client: PoolClient,
              private readonly streamId: string) {
  }

  async execute(
    events: DomainEvent[],
    expectedStreamPosition: number,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.client.query('SELECT pg_advisory_xact_lock($1)', [APPEND_LOCK_KEY]);
    let streamPosition = await this.checkedStreamPosition(expectedStreamPosition);
    if (events.length === 0) {
      return;
    }
    const { ids, positions, types, payloads, versions } = events.reduce(
      (columns, event) => {
        columns.ids.push(randomUUID());
        columns.positions.push(++streamPosition);
        columns.types.push(event.type);
        columns.payloads.push(JSON.stringify(event.payload));
        columns.versions.push(event.version);
        return columns;
      },
      {
        ids: [] as string[],
        positions: [] as number[],
        types: [] as string[],
        payloads: [] as string[],
        versions: [] as number[],
      },
    );
    // Single statement: all-or-nothing, one round-trip under the advisory lock, and no
    // per-event promise to lose. ORDER BY ord pins global_position assignment to batch order.
    // created_at comes from the database, not the appending process: it is read back only
    // to be subtracted from a *consumer's* clock (processing.lag_ms), which the Subscription
    // lag trigger alerts on — sourced app-side, that measurement absorbs the skew between
    // two machines. clock_timestamp(), not now(): now() is transaction-start time, and under
    // the advisory lock a transaction can begin well before it reaches this insert. The
    // column stays ms-epoch bigint, so rows written before this change read back unchanged.
    await this.client.query(
      `INSERT INTO events
             (id, stream_id, stream_position, event_type, payload, metadata, version, created_at)
       SELECT e.id, $2, e.stream_position, e.event_type, e.payload, $6::jsonb, e.version,
              (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::bigint
         FROM unnest($1::uuid[], $3::integer[], $4::text[], $5::jsonb[], $7::integer[])
                WITH ORDINALITY AS e(id, stream_position, event_type, payload, version, ord)
        ORDER BY e.ord`,
      [ids, this.streamId, positions, types, payloads, metadata ? JSON.stringify(metadata) : null, versions]
    );
  }

  private async checkedStreamPosition(expectedStreamPosition: number): Promise<number> {
    const { rows } = await this.client.query<{ len: number }>(
      'SELECT count(*)::int AS len FROM events WHERE stream_id = $1',
      [this.streamId]
    );
    if (rows[0].len !== expectedStreamPosition) {
      throw new ConcurrencyError(expectedStreamPosition, rows[0].len);
    }
    return rows[0].len;
  }
}
