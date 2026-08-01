// The versioned ring of master keys that wrap per-subject data keys. Wrapping
// always uses the current version; unwrapping selects by the version stamped on
// the row (data_keys.key_version), so rotation is: add a key, flip current,
// deploy — old rows re-wrap lazily as they are read (see PostgresDataKeys), and
// a version is retirable once no row references it. Validated once here so a
// misconfigured ring dies at boot, not mid-decrypt.
export class MasterKeyring {
  private readonly keys: Map<number, Buffer>;

  constructor(keys: ReadonlyMap<number, Buffer>, readonly current: number) {
    if (keys.size === 0) {
      throw new Error('MasterKeyring: at least one master key is required');
    }
    for (const [version, key] of keys) {
      if (!Number.isInteger(version) || version < 1) {
        throw new Error(`MasterKeyring: key versions must be positive integers, got "${version}"`);
      }
      if (key.length !== 32) {
        throw new Error(`MasterKeyring: master key version ${version} must be 32 bytes (AES-256)`);
      }
    }
    if (!keys.has(current)) {
      throw new Error(`MasterKeyring: current version ${current} is not in the keyring`);
    }
    this.keys = new Map(keys);
  }

  // The pre-rotation shape: one key, version 1 by convention — matching the
  // key_version DEFAULT that stamps rows created before versioning existed.
  static single(key: Buffer): MasterKeyring {
    return new MasterKeyring(new Map([[1, key]]), 1);
  }

  currentKey(): Buffer {
    return this.keyFor(this.current);
  }

  keyFor(version: number): Buffer {
    const key = this.keys.get(version);
    if (!key) {
      throw new Error(
        `MasterKeyring: no master key for key_version ${version} — retired before every row was re-wrapped?`,
      );
    }
    return key;
  }
}
