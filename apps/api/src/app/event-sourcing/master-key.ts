import { existsSync, readFileSync } from 'node:fs';
import { ConfigService } from '@nestjs/config';

const SECRET_FILE = '/etc/secrets/.env';

// The AES-256-GCM master key that wraps every per-vendor data key. On Render it
// lives in a Secret File, read straight off disk — never loaded into process.env,
// so env-scraping can't lift it alongside the DB creds. Locally it comes from
// apps/api/.env like any other config. Fails loud if absent or the wrong length,
// so a mis-pasted key dies at boot rather than mid-encrypt.
export function masterKey(config: ConfigService): Buffer {
  const raw = existsSync(SECRET_FILE) ? fromSecretFile() : config.getOrThrow<string>('MASTER_KEY');
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error('MASTER_KEY must be 32 bytes encoded as base64 (AES-256)');
  }
  return key;
}

function fromSecretFile(): string {
  const line = readFileSync(SECRET_FILE, 'utf8')
    .split('\n')
    .find((entry) => entry.startsWith('MASTER_KEY='));
  if (!line) {
    throw new Error(`MASTER_KEY not found in ${SECRET_FILE}`);
  }
  return line.slice('MASTER_KEY='.length).trim();
}
