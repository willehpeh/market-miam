import { randomBytes } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';
import { masterKey } from './master-key';

const configWith = (value: string): ConfigService =>
  ({ getOrThrow: () => value }) as unknown as ConfigService;

describe('masterKey', () => {
  it('decodes a 32-byte base64 key from config', () => {
    const key = masterKey(configWith(randomBytes(32).toString('base64')));
    expect(key).toHaveLength(32);
  });

  it('rejects a key that is not 32 bytes', () => {
    expect(() => masterKey(configWith(randomBytes(16).toString('base64')))).toThrow(/32 bytes/);
  });
});
