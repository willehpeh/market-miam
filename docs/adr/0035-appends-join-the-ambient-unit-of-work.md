# 0035. Appends join the ambient unit of work

Date: 2026-07-31 · Status: Accepted

## Context

The W2 finding: every Postgres adapter enlisted in the ambient transaction via
`PostgresUnitOfWork`-as-`Queryable` — except the event store, which took the
raw `Pool` and committed each append on its own dedicated connection. For
projections that was invisible. For a **processor** it broke the per-event
atomicity the subscription promises: the dispatched command's appends committed
immediately, outside the transaction wrapping `handle` + `checkpoint.write`, so
a checkpoint failure rolled back the checkpoint while the appended events
stayed durable. The retry then re-dispatched the command — exactly-once held
only because today's single processor happens to drive an idempotent aggregate
method. It also cost a second pooled connection per processor append, held
while the transaction's own client was held: with a pool no larger than the
concurrently-appending processor count (and no acquire timeout), a permanent
deadlock.

## Decision

- **`PostgresEventStore` takes the `PostgresUnitOfWork` alongside the `Pool`
  and asks it for `activeClient()`.** Inside a transaction, the append runs its
  advisory lock, concurrency check, and INSERT on that client and issues no
  BEGIN/COMMIT of its own — the outer commit decides durability, and the outer
  rollback discards the events. Outside a transaction (the HTTP command path,
  and every test that passes only a pool), the dedicated-client
  `AppendTransaction` path is byte-for-byte unchanged. The lock is
  `pg_advisory_xact_lock`, so it scopes to whichever transaction it joins.
- **`PostgresUnitOfWork.transaction` verifies its COMMIT tag** (the ADR 0034
  check, ported up). In joined mode there is no inner COMMIT to verify, so
  without this the fix would reintroduce W1 one layer up: an error swallowed
  inside the transaction aborts it, COMMIT resolves with a `ROLLBACK` tag, and
  the unit of work would report success while nothing persisted.
- **Reads route through the unit of work** (`Queryable` falls back to the pool
  outside a transaction), so a command dispatched inside a transaction
  load-then-saves against its own uncommitted appends.

Rejected:

- **`Queryable`-only wiring, like the view adapters** — an append is a
  multi-statement transaction that must pin one connection; `Queryable` can
  neither pin a client nor answer "is there an ambient transaction?", which is
  what the conditional BEGIN/COMMIT must branch on.
- **Declared per-processor delivery semantics** (at-most-once =
  checkpoint-then-handle, at-least-once = handle-then-checkpoint) — the honest
  frame when the side effect is external and atomicity is impossible, but
  every current processor side effect is a write to the same database, where
  true atomicity costs one transaction join. Revisit if a processor with an
  external side effect (email, payment API) ever lands.

## Consequences

- Exactly-once now genuinely holds for processors whose side effects are
  writes to this database — pinned by the container spec driving a checkpoint
  failure through a processor whose command appended: the events must be gone
  after rollback and appear exactly once after retry.
- A processor with a side effect that *leaves* the database is still
  at-least-once and must tolerate redelivery. No such processor exists; the
  constraint is now written down here rather than implicit in one aggregate's
  idempotent method.
- The global append lock (ADR 0028) is held until the **outer** commit — the
  whole handle + checkpoint transaction, not just the INSERT. Every append in
  the cluster can stall behind an appending processor's slowest per-event
  transaction; this moves M6's ceiling down and is accepted at current volume.
- Processor appends no longer take a second pooled connection (pinned by the
  max-1-pool container spec). A data-key mint inside the transaction still
  does — `PostgresDataKeys` stays deliberately pool-bound so a minted key
  survives a rolled-back append — so the pool needs `max ≥ 2`.
- Observability: in joined mode a successful `event-store append` span no
  longer implies durability — the outer commit decides later, and NOTIFY pokes
  for joined appends are delivered at that commit. Rolled-back appends now send
  no poke at all, and a retried processor no longer leaves the
  green-append-then-duplicate-handle trace shape behind.
