import { Checkpoint } from '../../ports/checkpoint';
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

  async write(position: number): Promise<void> {
    await this.db.query(
      `INSERT INTO checkpoints (subscription_name, position)
             VALUES ($1, $2)
        ON CONFLICT (subscription_name)
        DO UPDATE SET position = $2, updated_at = now()`,
      [this.subscriptionName, position],
    );
  }
}
