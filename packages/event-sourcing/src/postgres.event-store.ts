import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
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

export class PostgresEventStore implements EventStore, Events {
  constructor(private readonly pool: Pool) {}

  async append(
    streamId: string,
    events: DomainEvent[],
    expectedStreamPosition: number,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock($1)', [APPEND_LOCK_KEY]);

      const { rows } = await client.query<{ len: number }>(
        'SELECT count(*)::int AS len FROM events WHERE stream_id = $1',
        [streamId],
      );
      const len = rows[0].len;
      if (len !== expectedStreamPosition) {
        throw new ConcurrencyError(expectedStreamPosition, len);
      }

      const timestamp = Date.now();
      for (let i = 0; i < events.length; i++) {
        const event = events[i];
        await client.query(
          `INSERT INTO events
             (id, stream_id, stream_position, event_type, payload, metadata, version, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [randomUUID(), streamId, len + i + 1, event.type, event.payload, metadata ?? null, event.version, timestamp],
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw asConcurrencyError(error, expectedStreamPosition);
    } finally {
      client.release();
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

function asConcurrencyError(error: unknown, expected: number): Error {
  if (error instanceof ConcurrencyError) {
    return error;
  }
  if (typeof error === 'object' && error !== null && (error as { code?: string }).code === '23505') {
    return new ConcurrencyError(expected, expected);
  }
  return error as Error;
}
