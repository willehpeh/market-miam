import { existsSync, readFileSync } from 'node:fs';
import { ConfigService } from '@nestjs/config';
import { MasterKeyring } from '@market-miam/event-sourcing';

const SECRET_FILE = '/etc/secrets/.env';

// The AES-256-GCM master keyring that wraps every per-vendor data key. Two
// config shapes:
//
// - MASTER_KEY=<base64>                     — one key, becomes version 1. The
//   pre-rotation deployments; matches the key_version DEFAULT on existing rows.
// - MASTER_KEYS="1:<base64>;2:<base64>"     — the ring, plus
//   MASTER_KEY_CURRENT=2                    — which version wraps new mints.
//   Rotation = add the new version, flip current, deploy; retire the old
//   version from the ring once no data_keys row references it.
//
// On Render the values live in a Secret File, read straight off disk — never
// loaded into process.env, so env-scraping can't lift them alongside the DB
// creds; when the file exists it is the sole source. Locally they come from
// apps/api/.env like any other config. Fails loud if absent, malformed, or the
// wrong length, so a mis-pasted key dies at boot rather than mid-encrypt.
export function masterKeyring(config: ConfigService): MasterKeyring {
  const list = setting(config, 'MASTER_KEYS');
  if (list === undefined) {
    return MasterKeyring.single(decode(required(config, 'MASTER_KEY'), 'MASTER_KEY'));
  }
  const current = required(config, 'MASTER_KEY_CURRENT');
  return new MasterKeyring(new Map(list.split(';').map(parseEntry)), Number(current));
}

function parseEntry(entry: string): [number, Buffer] {
  const separator = entry.indexOf(':');
  if (separator < 1) {
    throw new Error(`MASTER_KEYS entries must be "<version>:<base64>", got "${entry.trim()}"`);
  }
  const version = Number(entry.slice(0, separator).trim());
  return [version, decode(entry.slice(separator + 1).trim(), `MASTER_KEYS version ${version}`)];
}

function decode(raw: string, label: string): Buffer {
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error(`${label} must be 32 bytes encoded as base64 (AES-256)`);
  }
  return key;
}

function required(config: ConfigService, name: string): string {
  const value = setting(config, name);
  if (value === undefined) {
    throw new Error(`${name} not found in ${existsSync(SECRET_FILE) ? SECRET_FILE : 'config'}`);
  }
  return value;
}

function setting(config: ConfigService, name: string): string | undefined {
  return existsSync(SECRET_FILE) ? fromSecretFile(name) : config.get<string>(name);
}

function fromSecretFile(name: string): string | undefined {
  const line = readFileSync(SECRET_FILE, 'utf8')
    .split('\n')
    .find((entry) => entry.startsWith(`${name}=`));
  return line?.slice(name.length + 1).trim();
}
