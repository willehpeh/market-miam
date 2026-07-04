import type { PoolClient, QueryResult } from 'pg';
import { DomainEvent } from '../domain-event';
import { randomUUID } from 'node:crypto';
import { ConcurrencyError } from '../concurrency.error';

export class AppendTransaction {

  private currentStreamPosition = 0;

  // ponytail: one global advisory lock serialises appends so global_position commits
  // in order — the single-bigint cursor stays gap-free (ADR 0028).
  private readonly APPEND_LOCK_KEY = 4_827_193;

  constructor(private readonly client: PoolClient,
              private readonly streamId: string) {
  }

  async open(): Promise<void> {
    await this.client.query('BEGIN');
    await this.client.query('SELECT pg_advisory_xact_lock($1)', [this.APPEND_LOCK_KEY]);
  }

  async append(
    events: DomainEvent[],
    expectedStreamPosition: number,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.performConcurrencyCheck(expectedStreamPosition);
    events.forEach((event) => this.appendEvent(event, metadata));
  }

  private async appendEvent(event: DomainEvent, metadata: Record<string, unknown> | undefined) {
    await this.client.query(
      `INSERT INTO events
             (id, stream_id, stream_position, event_type, payload, metadata, version, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [randomUUID(), this.streamId, ++this.currentStreamPosition, event.type, event.payload, metadata ?? null, event.version, Date.now()]
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

  async commit(): Promise<QueryResult> {
    return this.client.query('COMMIT');
  }

  async rollback(): Promise<QueryResult | undefined> {
    return this.client.query('ROLLBACK').catch(() => undefined);
  }

  release(): void {
    this.client.release();
  }
}
