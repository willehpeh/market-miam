import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import type { Pool } from 'pg';
import { DataKeys } from '../../ports/data-keys';
import { MasterKeyring } from './master-keyring';

// Data keys are AES-256-GCM data keys, stored envelope-encrypted under a master
// key from the keyring: the row holds `iv(12) || authTag(16) || ciphertext` plus
// the key_version that wrapped it. Master keys never touch the database, so a DB
// dump alone can't unwrap anything. Subject id is the GCM AAD, binding each
// wrapped key to its owner. Wrapping always uses the ring's current version;
// unwrapping selects by the row's version, and a row read under an old version
// is lazily re-wrapped under the current one — so rotating the master key is a
// config change, not an outage.
//
// Bound to the Pool, not the ambient Queryable/UnitOfWork, on purpose: a minted key
// must be durable even if the surrounding append rolls back (it may already have
// encrypted an event), and shred() is its own commit — sequenced before the
// read-model rebuild in VendorErasure, deliberately not atomic with it.
export class PostgresDataKeys extends DataKeys {
  constructor(
    private readonly pool: Pool,
    private readonly keyring: MasterKeyring,
  ) {
    super();
  }

  async getOrCreateKeyFor(subjectId: string): Promise<Buffer> {
    const existing = await this.findKeyFor(subjectId);
    if (existing) {
      return existing;
    }
    const wrapped = wrap(randomBytes(32), this.keyring.currentKey(), subjectId);
    await this.pool.query(
      'INSERT INTO data_keys (subject_id, wrapped_key, key_version) VALUES ($1, $2, $3) ON CONFLICT (subject_id) DO NOTHING',
      [subjectId, wrapped, this.keyring.current],
    );
    // A concurrent minter may have won the ON CONFLICT race — re-read so both callers
    // return the one key that actually persisted.
    const key = await this.findKeyFor(subjectId);
    if (key === null) {
      // The row was deleted between INSERT and re-read: a shred() racing this mint.
      // Fail loudly rather than resurrect an erased key or hand back null-as-Buffer.
      throw new Error(`PostgresDataKeys: key for "${subjectId}" vanished mid-mint (concurrent shred?)`);
    }
    return key;
  }

  async findKeyFor(subjectId: string): Promise<Buffer | null> {
    const { rows } = await this.pool.query<{ wrapped_key: Buffer; key_version: number }>(
      'SELECT wrapped_key, key_version FROM data_keys WHERE subject_id = $1',
      [subjectId],
    );
    if (rows.length === 0) {
      return null;
    }
    const { wrapped_key, key_version } = rows[0];
    const dataKey = unwrap(wrapped_key, this.keyring.keyFor(key_version), subjectId);
    if (key_version !== this.keyring.current) {
      await this.rewrap(subjectId, dataKey, key_version);
    }
    return dataKey;
  }

  async shred(subjectId: string): Promise<void> {
    await this.pool.query('DELETE FROM data_keys WHERE subject_id = $1', [subjectId]);
  }

  // Lazy rotation: after a successful unwrap under an old version, re-wrap the
  // same data key under the current master key. The data key never changes, only
  // its wrapping. The key_version guard makes this a compare-and-set: a
  // concurrent re-wrap is a no-op, and a racing shred's DELETE wins — an erased
  // key is never resurrected.
  private async rewrap(subjectId: string, dataKey: Buffer, fromVersion: number): Promise<void> {
    await this.pool.query(
      'UPDATE data_keys SET wrapped_key = $1, key_version = $2 WHERE subject_id = $3 AND key_version = $4',
      [wrap(dataKey, this.keyring.currentKey(), subjectId), this.keyring.current, subjectId, fromVersion],
    );
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
