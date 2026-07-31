# M5 — Read-path write amplification: one transaction per event per consumer

| | |
|---|---|
| Severity | Low (deliberate tradeoff — revisit at scale) |
| Area | Read path / performance |
| Files | `packages/event-sourcing/src/adapters/polling.subscription.ts:29-34` |
| Status | Open (accepted for current scale) |
| Found | 2026-07-31 evaluation @ `eec797b` |

## Issue

`PollingSubscription.poll()` opens one `unitOfWork.transaction` **per event**,
and inside it the `eventTypes()` filter decides whether to call the handler —
but `checkpoint.write` runs **unconditionally**. With four checkpointed
consumers today, every appended event costs four BEGIN / checkpoint-UPSERT /
COMMIT round-trip sets, even when at most one consumer's type filter matches.

There is also no way to push the filter down to SQL: `loadFrom` has no type
predicate and `event_type` is unindexed (`database/migrations/0001`), so every
consumer transfers and inspects every event.

To be clear about what this buys: the per-event transaction is what makes
handle + checkpoint atomic — the design's central read-path guarantee, proven
against real Postgres. This finding is about the *unconditional* cost, not the
mechanism.

## Failure scenario

Not a correctness failure — a scaling ceiling. Event volume × consumer count
multiplies small transactions on the same `checkpoints` rows. Symptoms at
scale: checkpoint-row contention between the four consumers' interleaved
upserts, poll latency growing linearly with backlog size regardless of
relevance, and the database doing ~4× the write work the domain requires.
Because idle polls are trace-suppressed and the projection⇄checkpoint
transaction is unspanned (documented gap §10.5 of
`EVENT-SOURCING-ARCHITECTURE.md`), this cost would today be invisible until it
showed up as lag.

## Evidence

Static: the loop body at `polling.subscription.ts:29-34` — filter inside the
transaction, unconditional `checkpoint.write`. Schema: no index on
`event_type`. Corroborating survivor from the evaluation's Stryker run: the
batch-loop continuation at `:36` mutated to `false` survives — batching
behaviour is loosely pinned, so restructuring this loop needs tests added
first (see [T1](t1-test-and-ci-blind-spots.md), fix 3).

## Suggested fix

Cheapest first; measure before doing any of it (there is currently no evidence
of actual contention at production volume):

1. **Skip the transaction entirely for non-matching events** within a batch,
   and write the checkpoint **once per batch** (position of the last event)
   instead of once per event. Atomicity only matters when a handler actually
   ran; a batch of irrelevant events needs one checkpoint write, not a hundred.
   At-least-once semantics are preserved — a crash mid-batch replays handled
   events, which projections absorb by design.
2. If cross-consumer traffic becomes the bottleneck: add a type predicate to
   `Events.loadFrom` (with an index on `(event_type, global_position)` or a
   partial index per hot type) so consumers fetch only what they handle. This
   changes a port signature — contract suites keep both adapters honest.

Regression tests to pin it: extend `subscriptionContract` with the >100-event
batch case first (kills the surviving mutant), then assert checkpoint position
after a mixed batch equals the batch's last event under the new write-once
behaviour, and that a handler throw still rolls back to the last committed
checkpoint.

Related: [M6](m6-write-path-scaling-ceilings.md) (the write-side ceilings this
compounds with), [W3](w3-checkpoint-monotonicity-and-ownership.md) (checkpoint
semantics any batching change must respect).
