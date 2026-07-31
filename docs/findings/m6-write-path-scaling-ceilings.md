# M6 — Write-path scaling ceilings: global lock, O(n) check, unbounded load

| | |
|---|---|
| Severity | Low (deliberate tradeoffs, ADR 0028 — revisit at scale) |
| Area | Write path / performance |
| Files | `packages/event-sourcing/src/adapters/postgres/append-transaction.ts:12,20,43-46`, `packages/event-sourcing/src/adapters/postgres/postgres.event-store.ts:32-38` |
| Status | Open (accepted for current scale) |
| Found | 2026-07-31 evaluation @ `eec797b` |

## Issue

Three ceilings, each individually documented and reasonable, that compound on
the same code path:

1. **Every append serialises cluster-wide** on one constant advisory lock
   (`pg_advisory_xact_lock(4_827_193)`), held from before the concurrency check
   until commit. This is what buys monotonic commit order for the single-bigint
   checkpoint cursor (ADR 0028) — the design is *correct*, and it solves the
   skipped-in-flight-row bug most hand-rolled stores ship. The cost is a hard
   throughput ceiling of one append at a time across all API instances,
   including the round trips inside the hold.
2. **The optimistic-concurrency check is O(stream length)**:
   `SELECT count(*) WHERE stream_id = $1` per append. Index-only scan on the
   `(stream_id, stream_position)` unique index, so it's as fast as a count can
   be — but it still grows with stream age, inside the global lock.
3. **`load()` is unbounded and there is no snapshotting**: every command
   rehydrates the full stream, with per-field GCM decryption on top for
   PII-bearing events (`ShreddingEventStore.load` maps every event through
   `decrypt`).

Net effect: command latency grows linearly with stream length, and one slow
append (long stream + big batch + decryption) extends the lock hold that every
other writer in the cluster is queued behind.

One documentation nit with teeth: the comment at `append-transaction.ts:10-11`
says the lock keeps the cursor "gap-free". It doesn't — `GENERATED ALWAYS AS
IDENTITY` burns values on any rollback after an INSERT. The invariant actually
bought is **monotonic commit order**, which is all the `> position` cursor
needs. Harmless today, but a future maintainer relying on gaplessness (e.g. for
a completeness check) would be building on a false premise.

## Failure scenario

Not a correctness failure at current volume. The cliff shapes: a marketplace-
scale registration burst serialises behind the lock; a vendor with years of
catalogue edits sees command latency creep as their streams lengthen; p99
append latency becomes the *cluster's* append latency because the lock makes
every writer share the slowest writer's hold time.

## Evidence

Static: lock and count at the cited lines; absence of `LIMIT`/snapshot anywhere
in the package. Index analysis (from the schema in
`database/migrations/0001:3-15`): `load`, `loadFrom`, `head`, and the count are
all optimally index-backed — the ceilings are algorithmic, not
missing-index bugs. No load or performance test exists anywhere in the repo, so
none of these ceilings has a measured baseline (see
[T1](t1-test-and-ci-blind-spots.md)).

## Suggested fix

Nothing to do *now* except two cheap items; the rest is a menu for when
measurement says so:

1. **Fix the comment**: say "monotonic commit order", not "gap-free"
   (`append-transaction.ts:10-11`). One line, prevents a future design error.
2. **Establish a baseline**: a simple appends-per-second and
   command-latency-vs-stream-length measurement (even a local script against a
   container) so "revisit at scale" has a number attached.
3. When needed, in escalation order: replace `count(*)` with
   `MAX(stream_position)` (same index, O(1)); cap rehydration cost with
   snapshots for the few aggregates that grow (Catalogue is the candidate);
   and only if append throughput itself becomes the bottleneck, revisit ADR
   0028 — e.g. per-stream advisory locks plus a gap-tolerant catch-up cursor,
   which is a substantially bigger change and needs the checkpoint story
   ([W3](w3-checkpoint-monotonicity-and-ownership.md)) settled first.

Related: [M5](m5-read-path-write-amplification.md) (the read-path half of the
same scaling story), ADR 0028 (the decision this finding annotates rather than
disputes).

## Update (2026-07-31)

The [W1](w1-silent-append-failure.md) fix
([#22](https://github.com/willehpeh/market-miam/pull/22)) replaced the
per-event INSERTs with one multi-row statement (ADR 0034), so the lock hold in
ceiling 1 now contains a single INSERT round-trip regardless of batch size —
"the round trips inside the hold" are down to lock + count + INSERT + COMMIT.
Ceilings 2 (O(n) count) and 3 (unbounded `load()`, no snapshots) are
unchanged, as is the "gap-free" comment nit at `append-transaction.ts:10-11`.
