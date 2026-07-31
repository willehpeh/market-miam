# W3 — Checkpoints accept backwards writes and have no owner

| | |
|---|---|
| Severity | High |
| Area | Read path / operations |
| Files | `packages/event-sourcing/src/adapters/postgres/postgres.checkpoint.ts:19-27`, `apps/api/src/app/event-sourcing/subscriptions.ts:95-108` |
| Status | Open |
| Found | 2026-07-31 evaluation @ `eec797b` |

## Issue

Two related absences:

1. **No monotonicity guard.** The checkpoint upsert is
   `ON CONFLICT (subscription_name) DO UPDATE SET position = $2` — it accepts
   any value, including one lower than the current position.
2. **No ownership.** Nothing anywhere — no advisory lock, no `FOR UPDATE`, no
   leader election — prevents two API instances from running the same
   subscription concurrently. `Subscriptions` discovers consumers and polls
   unconditionally on every instance.

## Failure scenario

**Multi-instance deploy (two or more API instances):** both instances poll every
subscription. Both process every event (double-processing); their interleaved
`read → handle → write` cycles can move the checkpoint backwards (instance A
writes 40, instance B — which read at 30 — writes 31), replaying events a third
time. Projections survive because they upsert idempotently; a **processor**
re-dispatches its commands on every replay, compounding
[W2](w2-appends-bypass-unit-of-work.md).

**Rebuild race (single instance is enough):** `rebuild()` writes checkpoint 0
and replays — while the background poller may be mid-`poll()` (the code comment
at `subscriptions.ts:95-98` concedes this, relying on projection idempotency).
Idempotency is not sufficient here: an in-flight `checkpoint.write(oldPosition)`
from the concurrent poll landing *after* the reset means the replay below
`oldPosition` is **silently skipped**. For the GDPR erasure path
(`VendorErasure.erase` → shred → rebuild), a skipped replay means plaintext PII
survives in the read model while the operation reports success — a compliance
failure, not a stale view.

## Evidence

Static: the upsert text at `postgres.checkpoint.ts:19-27`; absence of any
locking/ownership construct in `subscriptions.ts` (verified by reading the whole
runner). Test-side corroboration: the checkpoint contract is two tests (read-0,
read-back) with no per-name isolation and no `write(0)` case — see
[T1](t1-test-and-ci-blind-spots.md) — so nothing would catch a regression here
either.

## Suggested fix

Three parts, cheapest first:

1. **Monotonic guard** — one clause:
   ```sql
   ON CONFLICT (subscription_name) DO UPDATE
     SET position = EXCLUDED.position
   WHERE checkpoints.position < EXCLUDED.position
   ```
   This makes the late `write(oldPosition)` a no-op and closes the backwards
   move for free.
2. **Explicit reset path** — the guard breaks `rebuild()`'s `write(0)`, which is
   the one legitimate backwards write. Give `Checkpoint` a distinct
   `reset()` (unconditional `SET position = 0`) used only by `rebuild()`, so
   intent is explicit and ordinary writes stay guarded. Pause or drain the
   poller for the rebuilt subscription around the reset to close the remaining
   window (the code comment already flags this as the thing to do "if a
   non-idempotent projection ever lands" — the erasure scenario above argues for
   doing it now).
3. **Ownership** — at minimum, document the single-instance-per-subscription
   deployment constraint in `render.yaml`/ops docs; properly, take a per-
   subscription-name advisory lock (`pg_try_advisory_lock(hash(name))`) at poll
   start so a second instance skips instead of double-processing.

Regression tests to pin it: checkpoint contract gains (a) per-name isolation,
(b) lower-position write is a no-op, (c) `reset()` goes to 0; a container spec
races `rebuild()` against an in-flight poll and asserts the replay completes
from 0.
