import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import type { Pool } from 'pg';
import { DataKeys } from '../data-keys';

// Data keys are AES-256-GCM data keys, stored envelope-encrypted under the master
// key: the row holds `iv(12) || authTag(16) || ciphertext`. The master key never
// touches the database, so a DB dump alone can't unwrap anything. Subject id is the
// GCM AAD, binding each wrapped key to its owner.
export class PostgresDataKeys extends DataKeys {
  constructor(
    private readonly pool: Pool,
    private readonly masterKey: Buffer,
  ) {
    super();
  }

  async getOrCreateKeyFor(subjectId: string): Promise<Buffer> {
    const existing = await this.findKeyFor(subjectId);
    if (existing) {
      return existing;
    }
    const wrapped = wrap(randomBytes(32), this.masterKey, subjectId);
    await this.pool.query(
      'INSERT INTO data_keys (subject_id, wrapped_key) VALUES ($1, $2) ON CONFLICT (subject_id) DO NOTHING',
      [subjectId, wrapped],
    );
    // A concurrent minter may have won the ON CONFLICT race — re-read so both callers
    // return the one key that actually persisted.
    return (await this.findKeyFor(subjectId)) as Buffer;
  }

  async findKeyFor(subjectId: string): Promise<Buffer | null> {
    const { rows } = await this.pool.query<{ wrapped_key: Buffer }>(
      'SELECT wrapped_key FROM data_keys WHERE subject_id = $1',
      [subjectId],
    );
    return rows.length === 0 ? null : unwrap(rows[0].wrapped_key, this.masterKey, subjectId);
  }

  async shred(subjectId: string): Promise<void> {
    await this.pool.query('DELETE FROM data_keys WHERE subject_id = $1', [subjectId]);
  }
}

function wrap(dataKey: Buffer, masterKey: Buffer, subjectId: string): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', masterKey, iv);
  cipher.setAAD(Buffer.from(subjectId, 'utf8'));
  const ciphertext = Buffer.concat([cipher.update(dataKey), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]);
}

function unwrap(wrapped: Buffer, masterKey: Buffer, subjectId: string): Buffer {
  const iv = wrapped.subarray(0, 12);
  const tag = wrapped.subarray(12, 28);
  const ciphertext = wrapped.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', masterKey, iv);
  decipher.setAAD(Buffer.from(subjectId, 'utf8'));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}
