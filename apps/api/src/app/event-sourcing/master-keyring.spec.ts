import { randomBytes } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';
import { masterKeyring } from './master-keyring';

const configWith = (values: Record<string, string>): ConfigService =>
  ({ get: (name: string) => values[name] }) as unknown as ConfigService;

const key = () => randomBytes(32).toString('base64');

describe('masterKeyring', () => {
  it('builds a version-1 ring from a lone MASTER_KEY', () => {
    const ring = masterKeyring(configWith({ MASTER_KEY: key() }));

    expect(ring.current).toBe(1);
    expect(ring.currentKey()).toHaveLength(32);
  });

  it('rejects a MASTER_KEY that is not 32 bytes', () => {
    const short = randomBytes(16).toString('base64');
    expect(() => masterKeyring(configWith({ MASTER_KEY: short }))).toThrow(/32 bytes/);
  });

  it('throws when neither MASTER_KEYS nor MASTER_KEY is set', () => {
    expect(() => masterKeyring(configWith({}))).toThrow(/MASTER_KEY/);
  });

  it('parses a MASTER_KEYS ring and MASTER_KEY_CURRENT', () => {
    const ring = masterKeyring(
      configWith({ MASTER_KEYS: `1:${key()};2:${key()}`, MASTER_KEY_CURRENT: '2' }),
    );

    expect(ring.current).toBe(2);
    expect(ring.keyFor(1)).toHaveLength(32);
    expect(ring.keyFor(2)).toHaveLength(32);
  });

  it('requires MASTER_KEY_CURRENT when MASTER_KEYS is set', () => {
    expect(() => masterKeyring(configWith({ MASTER_KEYS: `1:${key()}` }))).toThrow(
      /MASTER_KEY_CURRENT/,
    );
  });

  it('rejects a MASTER_KEYS entry without a version prefix', () => {
    expect(() =>
      masterKeyring(configWith({ MASTER_KEYS: key(), MASTER_KEY_CURRENT: '1' })),
    ).toThrow(/<version>:<base64>/);
  });

  it('rejects a ring entry that is not 32 bytes, naming its version', () => {
    const short = randomBytes(16).toString('base64');
    expect(() =>
      masterKeyring(configWith({ MASTER_KEYS: `1:${key()};2:${short}`, MASTER_KEY_CURRENT: '1' })),
    ).toThrow(/version 2.*32 bytes/);
  });

  it('rejects a MASTER_KEY_CURRENT that names no ring entry', () => {
    expect(() =>
      masterKeyring(configWith({ MASTER_KEYS: `1:${key()}`, MASTER_KEY_CURRENT: '3' })),
    ).toThrow(/current version 3/);
  });
});
