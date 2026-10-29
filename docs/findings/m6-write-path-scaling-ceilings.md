# M6 — Write-path scaling ceilings: global lock, O(n) check, unbounded load

| | |
|---|---|
| Severity | Low (deliberate tradeoffs, ADR 0028 — revisit at scale) |
| Area | Write path / performance |
| Files | `packages/event-sourcing/src/adapters/postgres/append-transaction.ts:12,20,43-46`, `packages/event-sourcing/src/adapters/postgres/postgres.event-store.ts:32-38` |
| Status | Open (accepted for current scale; measured 2026-10-29) |
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

The [W2](w2-appends-bypass-unit-of-work.md) fix (ADR 0035) moves ceiling 1 the
other way for one path: an append dispatched inside a processor's transaction
joins it, so the advisory lock is held until the *outer* commit — the whole
handle + checkpoint transaction, not just the INSERT round-trip. Every writer
in the cluster can queue behind an appending processor's slowest per-event
transaction. Accepted at current volume (one processor, one cheap command);
this is the first number to look at if append latency ever climbs. The
"gap-free" comment nit is also now fixed — the comment says monotonic commit
order and names the burned-identity-values caveat (the class is now
`SerializedAppend` in `serialized-append.ts`; this finding's
`append-transaction.ts` line references are anchored to the evaluated commit).

## Baseline (2026-10-29)

`npm run baseline:write-path` ([`tools/write-path-baseline/`](../../tools/write-path-baseline/run.ts))
drives the real Postgres adapters against a throwaway database. Run at `c7d8a65` on
Postgres 16 in a 4-CPU cloud container, pool max 10, fsync 0.3 ms (`pg_test_fsync`).
Production talks to Postgres 18 over a network, so the script also ran through
`delay-proxy.mjs`: `SELECT 1` took 0.13 ms direct and 1.7 ms through the proxy (`RTT_MS=1`;
the proxy overshoots).
A second direct run matched within 20 % on throughput and the W2 rows; loads varied more
(plain, 10,000 events: 41 ms against 67).

**Ceiling 1, the global lock.** Throughput stops rising at two writers; more writers only queue.

| Writers | Direct: appends/s · p50 ms | 1.7 ms round trip: appends/s · p50 ms |
| --- | --- | --- |
| 1 | 415 · 2.2 | 102 · 9.6 |
| 2 | 455 · 4.3 | 165 · 12 |
| 4 | 502 · 7.8 | 161 · 24 |
| 8 | 479 · 16 | 167 · 47 |
| 16 | 464 · 34 | 168 · 95 |

The ceiling is round trips, not fsync: an append holds the lock for about 2 ms direct and
6 ms at 1.7 ms, some 2.5 round trips each. ADR 0028's "≈ 1 / commit-fsync, ~300–1,000/s"
overstates it for a database across a network. Ordering's Saturday-noon estimate is about
10 appends a second, 16 times under the slower ceiling.

**Ceilings 2 and 3, stream length.** p50, direct. At a 1.7 ms round trip appends cost
about 7 ms more and PII loads about 15 % more.

| Stream | Events | `load()` ms | `append()` ms |
| --- | --- | --- | --- |
| Plain | 100 | 1.2 | 2.1 |
| Plain | 1,000 | 5.7 | 1.8 |
| Plain | 10,000 | 67 | 5.2 |
| PII | 100 | 15 | 2.5 |
| PII | 1,000 | 143 | 3.4 |
| PII | 10,000 | 1,693 | 5.1 |

- The count costs 3 ms more at 10,000 events than at 100, all of it inside the lock.
- A load costs about 7 ms per 1,000 plain events.
- A PII load costs about 25 times as much: `ShreddingEventStore.readKeyFor` queries
  `data_keys` once per PII event, with no reuse within one `load()` or `loadFrom()`. With
  `InMemoryDataKeys` a 10,000-event PII load drops from 1.5 s to 0.49 s; the rest is GCM.

**W2, the lock held through a processor's transaction.** Four writers append while one
processor appends inside a transaction, then works before committing.

| Work after the append | Direct: writers' appends/s · p99 ms | 1.7 ms round trip: writers' appends/s · p99 ms |
| --- | --- | --- |
| 0 ms | 330 · 18 | 136 · 36 |
| 5 ms | 247 · 23 | 112 · 49 |
| 20 ms | 127 · 41 | 77 · 70 |

Every millisecond a processor spends after its append is lock time for every other writer.
Ordering's R2 already keeps Stripe calls out: a processor that calls Stripe appends nothing.

**Verdict.** Still accepted: nothing in ordering's expected load needs a fix. Two items
join the menu above: reuse one data key per subject within a `load()` or `loadFrom()`,
before a PII stream or a catch-up over PII events grows long (ordering's day keys are the
first candidate); and keep slow work out of a processor transaction that appends.
