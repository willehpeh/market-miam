# M2 — The master key can never be rotated

| | |
|---|---|
| Severity | Medium |
| Area | Crypto-shredding / GDPR |
| Files | `packages/event-sourcing/src/adapters/postgres/postgres.data-keys.ts:56-72`, `database/migrations/0003` (data_keys table) |
| Status | Open |
| Found | 2026-07-31 evaluation @ `eec797b` |

## Issue

Per-vendor data keys are wrapped under a master key that never touches the
database — correct envelope-encryption design. But the stored `wrapped_key` is a
bare `iv ‖ tag ‖ ciphertext` blob with **no version or key-id discriminator**,
and the `data_keys` table has no `key_version` column. The *value* envelope is
versioned (`enc:v1:` — `shredding.event-store.ts:14`); the *key* envelope is
not.

Consequence: there is exactly one master key, forever. Rotating `MASTER_KEY` —
routine hygiene, or mandatory after a suspected leak — makes `unwrap` fail GCM
authentication for **every existing row**. `findKeyFor` lets that throw
propagate, so `load()` and `loadFrom()` start throwing for every PII-bearing
stream.

## Failure scenario

An operator rotates the master key (new secret file, redeploy):

1. Every `getOrCreateKeyFor`/`findKeyFor` on an existing vendor fails GCM auth.
2. Every aggregate rehydration and every subscription poll touching a
   PII-bearing event throws.
3. The system is in a **total read outage for all vendor data**, with no
   in-band recovery — the old key must be restored to even begin a migration.

The failure mode of a routine ops action is an outage, and the failure mode of
the *security-critical* action (rotating a compromised key) is being unable to
do it safely at all.

## Evidence

Static: the unwrap path at `postgres.data-keys.ts:56-72` derives everything
from the blob layout and the single `masterKey` constructor argument; no
discriminator exists to select among keys. Test-side: the container spec pins
the blob layout (12+16+32 bytes) and the wrong-master-key rejection
(`postgres-data-keys.container.spec.ts:26-41`) — i.e. the current behaviour is
*proven*, including the property that makes rotation impossible.

## Suggested fix

Version the key envelope before there is enough data to make migration painful:

1. Add `key_version integer NOT NULL DEFAULT 1` to `data_keys` (or prefix the
   blob itself, mirroring `enc:v1:`).
2. `PostgresDataKeys` takes a keyring — `{ version → masterKey }` plus a
   current-version marker — instead of a single key. `unwrap` selects by the
   row's version; `wrap` always uses the current version.
3. Rotation then = add new key to the keyring, flip current, and lazily
   re-wrap: on each successful unwrap under an old version, re-wrap under the
   current one and update the row (data keys themselves never change, only
   their wrapping, so this is safe and incremental). Retire the old master key
   once no rows reference its version.

Regression tests to pin it: unwrap succeeds for rows wrapped under an old
version while new mints use the new one; re-wrap updates the row's version;
a version present in no keyring entry fails loudly with a message naming the
missing version (not a bare GCM error).

Related: [M4](m4-aad-omits-stream-position.md) (AAD hygiene in the same
adapter); `docs/POSTGRES-PLAN.md` tracks crypto-shredding work and is the
natural home for scheduling this.
