import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient, QueryResult } from 'pg';
import { ConcurrencyError } from './concurrency.error';
import { DomainEvent } from './domain-event';
import { EventStore } from './event-store';
import { Events } from './events';
import { StoredEvent } from './stored-event';

// ponytail: one global advisory lock serialises appends so global_position commits
// in order — the single-bigint cursor stays gap-free (ADR 0028).
const APPEND_LOCK_KEY = 4_827_193;

interface EventRow {
  id: string;
  event_type: string;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown> | null;
  version: number;
  stream_id: string;
  stream_position: number;
  global_position: string;
  created_at: string;
}

class AppendTransaction {

  private currentStreamPosition = 0;

  constructor(private readonly client: PoolClient,
              private readonly streamId: string) {
  }

  async open(): Promise<void> {
    await this.client.query('BEGIN');
    await this.client.query('SELECT pg_advisory_xact_lock($1)', [APPEND_LOCK_KEY]);
  }

  async append(
    events: DomainEvent[],
    expectedStreamPosition: number,
    metadata?: Record<string, unknown>,
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
      [this.streamId],
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

export class PostgresEventStore implements EventStore, Events {
  constructor(private readonly pool: Pool) {}

  async append(
    streamId: string,
    events: DomainEvent[],
    expectedStreamPosition: number,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const client = await this.pool.connect();
    const txn = new AppendTransaction(client, streamId);
    try {
      await txn.open();
      await txn.append(events, expectedStreamPosition, metadata);
      await txn.commit();
    } catch (error) {
      await txn.rollback();
      throw error;
    } finally {
      txn.release();
    }
  }

  async load(streamId: string): Promise<StoredEvent[]> {
    const { rows } = await this.pool.query<EventRow>(
      'SELECT * FROM events WHERE stream_id = $1 ORDER BY stream_position',
      [streamId],
    );
    return rows.map(toStoredEvent);
  }

  async loadFrom(globalPosition: number, limit: number): Promise<StoredEvent[]> {
    const { rows } = await this.pool.query<EventRow>(
      'SELECT * FROM events WHERE global_position > $1 ORDER BY global_position LIMIT $2',
      [globalPosition, limit],
    );
    return rows.map(toStoredEvent);
  }
}

function toStoredEvent(row: EventRow): StoredEvent {
  const event: StoredEvent = {
    id: row.id,
    type: row.event_type,
    payload: row.payload,
    version: row.version,
    streamId: row.stream_id,
    streamPosition: row.stream_position,
    globalPosition: Number(row.global_position),
    timestamp: Number(row.created_at),
  };
  if (row.metadata !== null) {
    event.metadata = row.metadata;
  }
  return event;
}
