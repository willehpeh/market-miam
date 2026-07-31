import type { Pool } from 'pg';
import { DomainEvent } from '../../domain/domain-event';
import { EventStore } from '../../ports/event-store';
import { Events } from '../../ports/events';
import { StoredEvent } from '../../domain/stored-event';
import { EventRow } from './event-row';
import { AppendTransaction } from './append-transaction';
import { PostgresUnitOfWork } from './postgres.unit-of-work';
import { Queryable } from './queryable';

export class PostgresEventStore implements EventStore, Events {
  // Without a unit of work every append commits on its own dedicated connection.
  // With one, an append issued inside unitOfWork.transaction(...) joins that
  // transaction instead — a processor's command appends become durable atomically
  // with its checkpoint, or not at all. Outside a transaction behaviour is unchanged.
  constructor(
    private readonly pool: Pool,
    private readonly unitOfWork?: PostgresUnitOfWork,
  ) {}

  async append(
    streamId: string,
    events: DomainEvent[],
    expectedStreamPosition: number,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const ambient = this.unitOfWork?.activeClient();
    const client = ambient ?? (await this.pool.connect());
    const txn = new AppendTransaction(client, streamId, ambient === undefined);
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
    const { rows } = await this.queryable().query<EventRow>(
      'SELECT * FROM events WHERE stream_id = $1 ORDER BY stream_position',
      [streamId],
    );
    return rows.map(toStoredEvent);
  }

  async loadFrom(globalPosition: number, limit: number): Promise<StoredEvent[]> {
    const { rows } = await this.queryable().query<EventRow>(
      'SELECT * FROM events WHERE global_position > $1 ORDER BY global_position LIMIT $2',
      [globalPosition, limit],
    );
    return rows.map(toStoredEvent);
  }

  async head(): Promise<number> {
    // COALESCE so an empty log reads 0 rather than null; Number() because MAX over a
    // bigint column comes back as a string.
    const { rows } = await this.queryable().query<{ head: string }>(
      'SELECT COALESCE(MAX(global_position), 0) AS head FROM events',
    );
    return Number(rows[0].head);
  }

  // Reads route through the unit of work so a command dispatched inside a transaction
  // sees its own uncommitted appends (load-then-save within one unit); outside a
  // transaction the unit of work falls back to the pool itself.
  private queryable(): Queryable {
    return this.unitOfWork ?? this.pool;
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
