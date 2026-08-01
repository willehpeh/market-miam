import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { MasterKeyring } from '@market-miam/event-sourcing';

describe('MasterKeyring', () => {
  it('single() builds a one-key ring at version 1', () => {
    const key = randomBytes(32);
    const ring = MasterKeyring.single(key);

    expect(ring.current).toBe(1);
    expect(ring.currentKey().equals(key)).toBe(true);
    expect(ring.keyFor(1).equals(key)).toBe(true);
  });

  it('currentKey returns the key of the current version, not the highest', () => {
    const old = randomBytes(32);
    const ring = new MasterKeyring(new Map([[1, old], [2, randomBytes(32)]]), 1);

    expect(ring.currentKey().equals(old)).toBe(true);
  });

  it('keyFor a version not in the ring throws naming the version', () => {
    const ring = MasterKeyring.single(randomBytes(32));

    expect(() => ring.keyFor(3)).toThrow(/key_version 3/);
  });

  it('rejects an empty ring', () => {
    expect(() => new MasterKeyring(new Map(), 1)).toThrow(/at least one/);
  });

  it('rejects a current version that is not in the ring', () => {
    expect(() => new MasterKeyring(new Map([[1, randomBytes(32)]]), 2)).toThrow(
      /current version 2/,
    );
  });

  it('rejects a key that is not 32 bytes, naming its version', () => {
    expect(
      () => new MasterKeyring(new Map([[1, randomBytes(32)], [2, randomBytes(16)]]), 1),
    ).toThrow(/version 2.*32 bytes/);
  });

  it('rejects non-positive-integer versions', () => {
    expect(() => new MasterKeyring(new Map([[0, randomBytes(32)]]), 0)).toThrow(
      /positive integers/,
    );
    expect(() => new MasterKeyring(new Map([[1.5, randomBytes(32)]]), 1.5)).toThrow(
      /positive integers/,
    );
  });
});
