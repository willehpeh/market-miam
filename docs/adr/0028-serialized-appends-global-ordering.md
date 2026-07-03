# 0028. Gap-free global ordering via serialized appends

Date: 2026-07-03 · Status: Accepted

## Context

The Postgres event store (0002, 0005) assigns `globalPosition` from a sequence at
insert time, but rows become visible at commit time. Concurrent appends therefore
commit out of order: A gets 5, B gets 6, B commits first; a subscription sees 6,
advances its checkpoint, then A commits 5 — permanently skipped. Rolled-back
appends leave permanent gaps too. Subscriptions and checkpoints (0015) track a
single monotonic `globalPosition`. This is the gap deferred in 0005.

## Decision

Serialize appends with a global advisory transaction lock (`pg_advisory_xact_lock`)
held for the whole append transaction. One append commits at a time, so position
order == commit order == visible order. The single-`bigint` cursor stays correct;
`Checkpoint`, `Events.loadFrom(position)`, and `StoredEvent.globalPosition` are
unchanged, and one contract suite covers both the in-memory and Postgres adapters.

Rejected:

- **Transaction-id + `pg_snapshot_xmin`** — read only rows from transactions older
  than any in-flight one. Allows parallel appends but forces a composite
  `(transactionId, position)` cursor through every port, and a long-running
  transaction stalls all consumers.
- **High-water-mark gap detection** (Marten async daemon) — a background agent
  finds the contiguous frontier and skips stale gaps after a timeout. Extra
  component, a skip heuristic, and a real event-skipping risk.

## Consequences

- Appends serialize globally. Ceiling ≈ 1 / commit-fsync (serialization forfeits
  group-commit amortization): ~300–1,000 appends/s on managed Postgres, low
  thousands on local NVMe — 1–2 orders of magnitude above this marketplace's
  command rate.
- Rollback gaps are permanent and safe: a `position >`-ordered read never misses a
  later-committing lower position.
- Reads/queries and low-load command latency are unaffected; the lock is
  uncontended below the ceiling.
- Resolves the global-position gap deferred in 0005.
- If append throughput ever bottlenecks: batch events per append, partition the
  lock per stream-category, or move to the `pg_snapshot_xmin` composite-cursor
  scheme (widens the port). Deferred.
