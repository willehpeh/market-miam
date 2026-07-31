# 0034. Appends are one atomic statement; COMMIT tags are verified

Date: 2026-07-31 · Status: Accepted

## Context

The W1 finding (fixed in #22): `AppendTransaction` fired one INSERT per event
from a `forEach` without awaiting, so every INSERT promise was dropped. On any
INSERT failure the transaction aborted, but Postgres resolves `COMMIT` on an
aborted transaction *successfully*, returning a `ROLLBACK` command tag instead
of raising — so `append()` resolved, the caller got a 2xx, zero events were
durable, and the dropped rejections crashed the process via
`unhandledRejection`. Two properties of the fix are invariants that would look
like removable cleanup to a future reader; this ADR records why they are not.

## Decision

- **A batch is written by a single `unnest`-based multi-row INSERT, awaited.**
  All events persist or none do, without leaning on transaction state to clean
  up a partial batch. Row order — and therefore `global_position` assignment
  under 0028's lock — is pinned explicitly with `WITH ORDINALITY … ORDER BY`
  rather than left to pg's client-queue timing. Bind-parameter count is
  constant in batch size, and the advisory-lock hold contains one INSERT
  round-trip instead of N.
- **`commit()` verifies the returned command tag and throws unless it is
  `COMMIT`.** A resolved `COMMIT` query is not evidence of persistence on
  Postgres. The check makes the whole class of swallowed-in-transaction-error
  bugs loud, not just the instance W1 found.

Rejected:

- **Sequential awaited per-event INSERTs** — fixes W1's error path, but keeps
  N round-trips inside the global lock hold (M6) and leaves batch atomicity
  and ordering resting on transaction machinery instead of one statement.
- **Trusting `COMMIT`'s resolution** — standard, documented Postgres behaviour
  is to report commit-of-aborted-transaction as success-with-`ROLLBACK`-tag.

## Consequences

- Splitting the INSERT back into per-event statements, or deleting the
  "redundant" tag check, reintroduces W1's failure class. The container spec
  driving a mid-batch jsonb rejection (a NUL byte in a payload string) through
  `append()` pins both: it must reject and persist nothing.
- Lock hold time shrinks to lock + count + INSERT + COMMIT — a partial
  mitigation of M6's throughput ceiling; the O(n) concurrency count and
  unbounded `load()` remain as they were.
- Empty batches return early — `INSERT … VALUES` with zero rows is not valid
  SQL, and there is nothing to persist.
- The defect's original shape — a dropped promise — is also guarded statically:
  `@typescript-eslint/no-floating-promises` runs workspace-wide (#23).
