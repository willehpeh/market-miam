import { Checkpoint } from '../../ports/checkpoint';
import { CheckpointConflictError } from '../../domain/checkpoint-conflict.error';
import { Queryable } from './queryable';

export class PostgresCheckpoint implements Checkpoint {
  constructor(
    private readonly db: Queryable,
    private readonly subscriptionName: string,
  ) {}

  async read(): Promise<number> {
    const { rows } = await this.db.query<{ position: string }>(
      'SELECT position FROM checkpoints WHERE subscription_name = $1',
      [this.subscriptionName],
    );
    const [row] = rows;
    return row ? Number(row.position) : 0;
  }

  async advance(from: number, to: number): Promise<void> {
    const updated = await this.db.query(
      `UPDATE checkpoints
          SET position = $3, updated_at = now()
        WHERE subscription_name = $1 AND position = $2`,
      [this.subscriptionName, from, to],
    );
    if (updated.rowCount === 1) {
      return;
    }
    // A missing row reads as position 0, so only an advance from 0 may create it.
    // Two fresh instances racing here: one inserts, the other conflicts below.
    if (from === 0) {
      const inserted = await this.db.query(
        `INSERT INTO checkpoints (subscription_name, position)
              VALUES ($1, $2)
         ON CONFLICT (subscription_name) DO NOTHING`,
        [this.subscriptionName, to],
      );
      if (inserted.rowCount === 1) {
        return;
      }
    }
    throw new CheckpointConflictError(this.subscriptionName, from);
  }

  async reset(): Promise<void> {
    await this.db.query(
      `INSERT INTO checkpoints (subscription_name, position)
            VALUES ($1, 0)
       ON CONFLICT (subscription_name)
       DO UPDATE SET position = 0, updated_at = now()`,
      [this.subscriptionName],
    );
  }
}
