import type { PoolClient, QueryResult } from 'pg';
import { DomainEvent } from '../../domain/domain-event';
import { randomUUID } from 'node:crypto';
import { ConcurrencyError } from '../../domain/concurrency.error';

export class AppendTransaction {

  private currentStreamPosition = 0;

  // ponytail: one global advisory lock serialises appends so global_position commits
  // in order — monotonic commit order, which is all the single-bigint cursor needs
  // (ADR 0028; rollbacks still burn identity values, so positions are not gap-free).
  private readonly APPEND_LOCK_KEY = 4_827_193;

  // ownsTransaction=false joins an ambient transaction on the caller's client: the
  // lock and the write run on it, but BEGIN/COMMIT/ROLLBACK/release stay with the
  // owner — its commit is what makes the events durable, and its rollback discards
  // them. The advisory lock is pg_advisory_xact_lock, so it scopes to whichever
  // transaction it joins either way.
  constructor(private readonly client: PoolClient,
              private readonly streamId: string,
              private readonly ownsTransaction = true) {
  }

  async open(): Promise<void> {
    if (this.ownsTransaction) {
      await this.client.query('BEGIN');
    }
    await this.client.query('SELECT pg_advisory_xact_lock($1)', [this.APPEND_LOCK_KEY]);
  }

  async append(
    events: DomainEvent[],
    expectedStreamPosition: number,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.performConcurrencyCheck(expectedStreamPosition);
    if (events.length === 0) {
      return;
    }
    const { ids, positions, types, payloads, versions } = events.reduce(
      (columns, event) => {
        columns.ids.push(randomUUID());
        columns.positions.push(++this.currentStreamPosition);
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
    await this.client.query(
      `INSERT INTO events
             (id, stream_id, stream_position, event_type, payload, metadata, version, created_at)
       SELECT e.id, $2, e.stream_position, e.event_type, e.payload, $6::jsonb, e.version, $8
         FROM unnest($1::uuid[], $3::integer[], $4::text[], $5::jsonb[], $7::integer[])
                WITH ORDINALITY AS e(id, stream_position, event_type, payload, version, ord)
        ORDER BY e.ord`,
      [ids, this.streamId, positions, types, payloads, metadata ? JSON.stringify(metadata) : null, versions, Date.now()]
    );
  }

  private async performConcurrencyCheck(expectedStreamPosition: number): Promise<void> {
    const { rows } = await this.client.query<{ len: number }>(
      'SELECT count(*)::int AS len FROM events WHERE stream_id = $1',
      [this.streamId]
    );
    this.currentStreamPosition = rows[0].len;
    if (this.currentStreamPosition !== expectedStreamPosition) {
      throw new ConcurrencyError(expectedStreamPosition, this.currentStreamPosition);
    }
  }

  async commit(): Promise<QueryResult | undefined> {
    if (!this.ownsTransaction) {
      return undefined;
    }
    // Postgres resolves COMMIT on an aborted transaction successfully, with a ROLLBACK
    // command tag — any swallowed in-transaction error would otherwise read as a durable write.
    const result = await this.client.query('COMMIT');
    if (result.command !== 'COMMIT') {
      throw new Error(`append transaction was rolled back: COMMIT returned ${result.command}`);
    }
    return result;
  }

  async rollback(): Promise<QueryResult | undefined> {
    if (!this.ownsTransaction) {
      return undefined;
    }
    return this.client.query('ROLLBACK').catch(() => undefined);
  }

  release(): void {
    if (this.ownsTransaction) {
      this.client.release();
    }
  }
}
