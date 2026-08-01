# 0040. Master keys form a versioned keyring; rows re-wrap lazily on read

Date: 2026-08-01 · Status: Accepted

## Context

The M2 finding: per-vendor data keys are wrapped under a master key that never
touches the database — correct envelope encryption — but the stored blob
(`iv ‖ authTag ‖ ciphertext`) carried no version or key-id discriminator, and
`data_keys` had no version column. There was exactly one master key, forever.
Rotating `MASTER_KEY` — routine hygiene, or mandatory after a suspected leak —
made GCM unwrap fail for every existing row: every aggregate rehydration and
every subscription poll touching a PII-bearing event would throw, a total read
outage for all vendor data with no in-band recovery. The failure mode of the
security-critical action (rotating a compromised key) was being unable to do
it at all. The value envelope was already versioned (`enc:v1:`); the key
envelope was not.

## Decision

**Version the key envelope in a column; rotate by keyring; re-wrap lazily.**

1. `data_keys` gains `key_version integer NOT NULL DEFAULT 1` (migration
   0011). The `DEFAULT` *is* the backfill: every pre-existing row is declared
   "wrapped under version 1", made true by convention because a lone
   `MASTER_KEY` config lands in the ring as version 1. The blob layout is
   untouched — the discriminator lives in the column, not the bytes.
2. A `MasterKeyring` value object (`{version → key}` plus a current-version
   marker) replaces the single `masterKey` constructor argument of
   `PostgresDataKeys`. It validates at construction — ring non-empty, every
   key 32 bytes, current present — so a misconfigured ring dies at boot.
   `keyFor(version)` for a version not in the ring throws an error **naming
   the version**, not a bare GCM failure.
3. `wrap` always uses the current version; `unwrap` selects the master key by
   the row's `key_version`. After a successful unwrap under an old version,
   the row is **re-wrapped under the current key in place** — the data key
   itself never changes, only its wrapping, so event ciphertexts are never
   touched. The UPDATE is guarded by `AND key_version = <old>`: a concurrent
   re-wrap is a no-op and a racing `shred()` DELETE wins, so an erased key is
   never resurrected.
4. Composition (`apps/api`): `masterKeyring(config)` accepts either the
   existing `MASTER_KEY` (→ single-key ring, version 1 — deployed systems
   need no config change) or `MASTER_KEYS="1:<base64>;2:<base64>"` +
   `MASTER_KEY_CURRENT=<version>`. `MASTER_KEY_CURRENT` is required with
   `MASTER_KEYS` — flipping the wrap version is an explicit operator act,
   not a max() inference. The Render secret-file path covers all three
   variables and remains the sole source when the file exists.

Rotation is then: add the new key to the ring, flip current, deploy. Old rows
re-wrap as they are read; retirement is measurable
(`SELECT count(*) FROM data_keys WHERE key_version < <current>` → 0, hurried
along if desired by a sweep that calls `findKeyFor` per subject) and enforced
loudly — a row referencing a dropped version fails naming the version.

Rejected:

- **Version prefix inside the blob** — existing blobs have no prefix, so
  reading would need a heuristic; a column needs none, is queryable for the
  retirement check, and costs one `ALTER TABLE`.
- **Eager re-wrap migration at rotation time** — a full-table rewrite inside
  a deploy window, against a table whose rows are individually cheap to
  re-wrap on read. Lazy is incremental, restartable, and needs no tooling;
  an operator who wants eager can still run the sweep.
- **Deriving the current version implicitly (highest in ring)** — silently
  changes which key wraps new mints the moment a key is staged; the explicit
  marker separates "key is available for unwrap" from "key wraps new data".
- **Changing the `DataKeys` port** — rotation is entirely a Postgres-adapter
  concern; `InMemoryDataKeys` stores raw keys and wraps nothing. The port
  and its contract are untouched.

## Consequences

- Master-key rotation is a config change, not an outage; a compromised key
  can be retired with a measurable completion criterion.
- The read path now performs a write (the lazy re-wrap) for old-version rows.
  It is one CAS UPDATE per subject per rotation, pool-bound like every other
  `PostgresDataKeys` statement, and disappears once the row is current. A
  re-wrap failure fails the read loudly — preferable to silently never
  converging.
- `key_version` is metadata, not a secret: it says which key wrapped a row,
  never anything about key material.
- Pinned by `master-keyring.spec.ts` (fast: ring validation, named-version
  errors, config parsing in the api spec) and
  `postgres-data-keys.container.spec.ts` (rotation: old-version unwrap,
  re-wrap on read with same data key surviving retirement, current-version
  mints, untouched current rows, loud named failure for retired versions).
  Container specs are written against the real migrations but were authored
  without Docker in this environment — first CI/local container run will
  execute them.
- The value-envelope work ([M4](../findings/m4-aad-omits-stream-position.md),
  `enc:v2` with a position-bearing AAD) rides on the same
  version-discriminator pattern, on the value side.
