import type { Pool } from 'pg';
import { DomainEvent } from '../../domain/domain-event';
import { EventStore } from '../../ports/event-store';
import { Events } from '../../ports/events';
import { StoredEvent } from '../../domain/stored-event';
import { EventRow } from './event-row';
import { SerializedAppend } from './serialized-append';
import { PostgresUnitOfWork } from './postgres.unit-of-work';

export class PostgresEventStore implements EventStore, Events {
  // The unit of work decides where every statement lands. An append issued inside
  // unitOfWork.transaction(...) joins that transaction — a processor's command
  // appends commit atomically with its checkpoint — and reads inside one see its
  // own uncommitted appends; outside a transaction everything falls back to the
  // pool. Construction with only a Pool (tests, and any standalone use) gets a
  // private unit of work that never has an ambient transaction: unchanged
  // one-transaction-per-append behaviour.
  constructor(
    pool: Pool,
    private readonly unitOfWork: PostgresUnitOfWork = new PostgresUnitOfWork(pool),
  ) {}

  append(
    streamId: string,
    events: DomainEvent[],
    expectedStreamPosition: number,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    return this.unitOfWork.inTransaction((client) =>
      new SerializedAppend(client, streamId).execute(events, expectedStreamPosition, metadata),
    );
  }

  async load(streamId: string): Promise<StoredEvent[]> {
    const { rows } = await this.unitOfWork.query<EventRow>(
      'SELECT * FROM events WHERE stream_id = $1 ORDER BY stream_position',
      [streamId],
    );
    return rows.map(toStoredEvent);
  }

  async loadFrom(globalPosition: number, limit: number): Promise<StoredEvent[]> {
    const { rows } = await this.unitOfWork.query<EventRow>(
      'SELECT * FROM events WHERE global_position > $1 ORDER BY global_position LIMIT $2',
      [globalPosition, limit],
    );
    return rows.map(toStoredEvent);
  }

  async head(): Promise<number> {
    // COALESCE so an empty log reads 0 rather than null; Number() because MAX over a
    // bigint column comes back as a string.
    const { rows } = await this.unitOfWork.query<{ head: string }>(
      'SELECT COALESCE(MAX(global_position), 0) AS head FROM events',
    );
    return Number(rows[0].head);
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
