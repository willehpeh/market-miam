# W3 — Checkpoints accept backwards writes and have no owner

| | |
|---|---|
| Severity | High |
| Area | Read path / operations |
| Files | `packages/event-sourcing/src/adapters/postgres/postgres.checkpoint.ts:19-27`, `apps/api/src/app/event-sourcing/subscriptions.ts:95-108` |
| Status | **Fixed** — CAS checkpoints, [ADR 0036](../adr/0036-checkpoint-advances-are-compare-and-set.md) (pending merge) |
| Found | 2026-07-31 evaluation @ `eec797b` |
| Analysed | 2026-08-01 @ `028b6f7` — confirmed with corrections ([below](#analysis--2026-08-01-challenge)) |

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

## Analysis — 2026-08-01 challenge

Re-examined at `028b6f7`. Every factual claim was re-verified against the code;
the finding stands, with one corrected mechanism, one understated exposure, and
a revised fix ordering. One assumption the finding leaves implicit was also
confirmed: checkpoint writes really are transactional with handler effects —
`CHECKPOINT_FACTORY` hands `PostgresCheckpoint` the UoW-backed `Queryable`
(`postgres-persistence.module.ts:124-127`), so the per-event
`handle + write` at `polling.subscription.ts:29-34` commits or rolls back as
one.

### Confirmed

The upsert text, the absence of any ownership construct, and the test blind
spot are all as described — the shared checkpoint contract
(`test/src/event-sourcing/checkpoint.contract.ts`) is exactly two tests, run
against both adapters, with no per-name isolation and no backwards-write case.
`POLLING_ENABLED` is hardwired `true` for every instance
(`event-sourcing.module.ts:42`); nothing conditions polling on identity.

### Challenged

**1. "Multi-instance deploy" understates the exposure — the overlap happens on
every deploy.** `render.yaml` runs one `api` instance (starter plan, no
scaling block), so read literally the scenario sounds hypothetical. It isn't:
Render replaces web-service instances with a zero-downtime rollout, so the old
instance keeps running — and polling — until the new one is live, and
`autoDeployTrigger: checksPass` makes that overlap frequent and unattended.
(`onApplicationShutdown` stops the *stream*, but an in-flight `poll()` promise
is not cancelled by `takeUntil` and can land writes until process exit.) The
counterweight: today's only processor is `opens-storefronts`, and
`Storefront.open()` no-ops when already open (`storefront.ts:36-39`), so a
double-dispatched `OpenStorefront` is currently benign. Double-processing is a
landmine armed by the *next* processor (email, payment, webhook), not an active
fire — nothing marks "processors must tolerate double-dispatch" anywhere.

**2. The stated GDPR mechanism is incomplete; the conclusion survives via
load-time decryption.** As written, the causal chain does not produce plaintext
survival. `rebuild()` clears the read model and resets the checkpoint in one
real transaction (`subscriptions.ts:103-106` — both the view store and the
checkpoint route through the shared `PostgresUnitOfWork`), so the old plaintext
rows are gone regardless of any checkpoint race; and any event *re-handled*
after `keys.shred()` decrypts to the `SHREDDED` sentinel. A late forward
checkpoint write alone therefore produces a **hollowed-out read model** — rows
silently missing below the stale checkpoint — which is a real failure (silent
partial rebuild) but an availability one, not PII survival. Plaintext survives
only via a sharper path the finding skips: `loadFrom` decrypts **at load time**
(`shredding.event-store.ts:38-40`), so an in-flight poll holds up to
`BATCH_SIZE` decrypted events in memory. A batch loaded *before* the shred
whose per-event transactions land *after* the reset re-inserts plaintext rows
**and** advances the checkpoint past them, so the replay never overwrites them.
Same headline, but it means the fix must eliminate the interleaving itself —
guarding the backwards write does nothing here.

**3. "Cheapest first" inverts the dependency between the parts.** The
monotonic guard never fires in the erasure race: after reset-to-0, every stale
in-flight write is a *forward* write and passes the guard. The guard only
prevents the third replay in the steady-state interleave — the mildest scenario
in this finding (projections are idempotent; processors are already
double-processing before any backwards move). What closes the reported
compliance failure is part 2's "pause or drain the poller" (same instance) plus
part 3's ownership (other instances) — presented in the finding as optional
hardening and documentation respectively. The parts are not independent
improvements; parts 2–3 are the fix and part 1 is defense-in-depth.

**4. Fix-shape corrections.**

- The suggested SQL drops `updated_at = now()` from the `SET` clause — keep it.
- The guard must land in `InMemoryCheckpoint` too, or the adapters diverge and
  the shared contract test can't hold for both.
- `pg_try_advisory_lock(hash(name))` through a pooled `query()` is a footgun:
  session-level advisory locks belong to the *connection* that served the
  query, which the pool immediately hands to someone else, and unlock must hit
  that same connection. Done properly this is a dedicated pinned client per
  instance — acquire per-subscription locks at bootstrap (key via
  `hashtextextended(name, 0)`), poll only what you hold, retry acquisition on a
  timer. That shape also degrades gracefully across deploy overlaps: the new
  instance skips until the old session dies.
- Considered and rejected for now: compare-and-set on the checkpoint row
  (`DO UPDATE … WHERE checkpoints.position = $expected`, rowcount 0 → abort)
  would make the checkpoint its own fencing token — monotonicity and effect
  exclusion in one mechanism, no lock lifetimes. But CAS *detects and rolls
  back*, and with [W2](w2-appends-bypass-unit-of-work.md) open a processor's
  dispatched commands don't roll back — prevention (the lock) beats detection
  until W2 lands.
- The cleanest shape for part 2 is a per-consumer async gate serialising
  `poll()` and `rebuild()`, not "pausing" the stream: the per-subscription
  `exhaustMap` (`subscriptions.ts:162`) already prevents background polls from
  overlapping each other, so the only same-instance overlaps are direct calls —
  `rebuild()`, `drain()` — racing the stream, and one gate closes all of them.

### Revised fix order

1. **Per-consumer gate** making `poll()` and `rebuild()` mutually exclusive.
   Closes the single-instance erasure race outright, including the
   stale-decrypted-batch path (a poll queued behind the gate loads its batch
   after the shred and writes sentinels).
2. **Monotonic guard** in both adapters + a distinct `Checkpoint.reset()` used
   by `rebuild()`, pinned by the contract tests already listed (per-name
   isolation, backwards no-op, reset-to-0).
3. **Ownership** via bootstrap-acquired advisory locks on a dedicated pinned
   connection. Until it lands, document the single-instance constraint *and*
   the deploy-overlap caveat: an erasure run during a deploy retains a residual
   cross-instance window that only ownership (or re-running the erasure)
   closes.
4. **Regression**: the container spec racing `rebuild()` against an in-flight
   poll, asserting the replay completes from 0 and the read model holds only
   sentinels for the erased vendor.

Severity stays **High**: silent success on a compliance path earns it on
consequence, even though today's topology (one instance, millisecond-wide
window, rare manual erasures) makes the probability low. The urgency inside
that rating is driven less by the erasure race than by challenge 1 — every
deploy already runs the two-instance interleave, and the first non-idempotent
processor turns it from latent to live.

## Resolution

Fixed by making the checkpoint a fencing token —
[ADR 0036](../adr/0036-checkpoint-advances-are-compare-and-set.md) — rather
than by any of the mechanisms proposed above. The landed shape supersedes the
revised fix order: during review, the gate + guard + advisory-lock plan was
challenged as three coordination mechanisms (plus a "don't run erasure
mid-deploy" process rule) compensating for one root weakness — the
unconditional checkpoint write.

What landed:

- `Checkpoint.write(position)` became `advance(from, to)`: the Postgres
  adapter compiles it to `UPDATE … WHERE subscription_name = $1 AND
  position = $2`, throwing `CheckpointConflictError` on zero rows; the
  in-memory adapter mirrors it. `reset()` (unconditional, to 0) is the one
  legitimate non-forward move, used only by `rebuild()`.
- `PollingSubscription` threads the expected position through its per-event
  transaction, so a conflict rolls the handler's effects back with it. A
  stale in-flight poll — including one holding a pre-shred plaintext batch —
  can neither land effects nor move the checkpoint after a rebuild's reset;
  both failure scenarios above die at the database, on any number of
  instances, with no locks, no in-process gate, and no deploy constraints.
- `Subscriptions` treats `CheckpointConflictError` as yield-not-failure
  (quiet log; the existing backoff retry re-reads the checkpoint).
- The checkpoint contract grew from two tests to eight (per-name isolation,
  stale-advance rejection, first-advance-from-nonzero rejection, `reset()`
  semantics, and the W3 fence: advance-from-pre-reset-position rejected),
  running against both adapters; a container spec proves on real pg that a
  stale writer's view write rolls back with its rejected advance. This closes
  the checkpoint slice of [T1](t1-test-and-ci-blind-spots.md) gap 5.

Residuals:

- ~~Processor exactly-once remains conditional on
  [W2](w2-appends-bypass-unit-of-work.md).~~ Resolved: W2's fix
  ([#24](https://github.com/willehpeh/market-miam/pull/24),
  [ADR 0035](../adr/0035-appends-join-the-ambient-unit-of-work.md)) landed
  alongside this one — appends join the ambient unit of work, so a conflict
  rolls back a processor's dispatched appends with its checkpoint. The two
  fixes compose into full processor exactly-once for in-database effects.
- External side effects (none exist yet) are outside any transactional
  guarantee; ADR 0036's consequences record the idempotency-key rule
  (`${subscriptionName}:${event.id}`) that must accompany the first one.
