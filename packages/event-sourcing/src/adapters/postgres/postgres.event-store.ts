import type { Pool } from 'pg';
import { DomainEvent } from '../../domain/domain-event';
import { EventStore } from '../../ports/event-store';
import { Events } from '../../ports/events';
import { StoredEvent } from '../../domain/stored-event';
import { EventRow } from './event-row';
import { AppendTransaction } from './append-transaction';

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
