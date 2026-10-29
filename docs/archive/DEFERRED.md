# Deferred Decisions

> **Archived 2026-08-02** — the deferred-decisions register (ADR 0017) merged into the root `NEXT_BEHAVIOURS.md`, which is now the single backlog. This file is kept for the detailed rationale behind each entry; the one-line triggers live in `NEXT_BEHAVIOURS.md`.

Genuinely-open decisions, not yet implemented and not tracked elsewhere. Resolved/built decisions live in their ADRs, `EVENT-SOURCING-ARCHITECTURE.md`, and the code. The database build plan is complete and archived (`POSTGRES-PLAN.md`, this folder); its three deferred items live here (orphan-checkpoint detection, dead-lettering, and the composite cursor, since replaced by *Lock-free appends*).

## vendorIdFrom error handling

`vendorIdFrom` currently does a raw cast with no validation. Error handling (throw if vendorId is missing from metadata) was deferred because no test drives it yet. Add when there's a failure scenario that justifies it.

## Client-supplied idempotency

Not needed yet. Natural idempotency already comes from three layers: client-supplied aggregate identity (`vendorId`, `itemId` arrive on the command), domain-level idempotency in handlers (e.g. `RegisterVendor` retains the original on re-registration), and optimistic concurrency (`expectedStreamPosition` rejects concurrent duplicates). Revisit when either appears: a non-idempotent *relative* mutation (e.g. "increment stock by 5", where a retry double-applies), or an external side effect that can't be repeated (payment capture, outbound email/SMS).

When added, it is a separate concern from causation — a distinct metadata field plus a *front gate* that dedups before the handler executes (on a hit: skip execution, append nothing, return the prior outcome). Do not reuse the causation id slot for it: the idempotency key must be stable across retries, whereas the causation id must be unique per dispatch — collapsing them corrupts lineage in exactly the retry case. The causation id stays internally generated. (A client-supplied *correlation seed* is a third, separate input: accept-external-or-generate into the `correlationId` ALS field.) If the front-gate ever needs a durable dedup store, that store is pg (a new migration + adapter, same conventions as `POSTGRES-PLAN.md`).

## Subscription as a publication requirement

Publishing a storefront requires readiness (ADR 0031); once we charge vendors, an **active subscription** joins the list. Billing is a separate bounded context (a generic subdomain — plans, invoices, payment, dunning — its language does not belong in Market Days; cf. ADR 0004). Not built: not charging yet.

The seam is already shaped. Readiness is assembled by the `StorefrontPublication` domain service from symmetric self-queries; the subscription requirement enters as *one more*: `subscriptions.isActiveFor(vendor)` behind a **local entitlement read model** — a projection fed by the billing context's events (`SubscriptionActivated`/`…Lapsed` → `entitlement(vendorId, active)`). The service gains one `missing.push('subscription')`; the `Storefront` aggregate never learns the word "subscription." Do **not** put a synchronous Stripe call in the publish path — project billing events into the local entitlement instead, keeping the check a local read. Forced when the first paid plan ships.

## Scoped projection reset

`Projection.reset()` clears a projection's whole read model, but the caller that needs it — `VendorErasure` — erases a *single* vendor. So erasing one vendor deletes every vendor's rows and replays the entire log to rebuild them. Two consequences per rebuild: it costs O(entire log), and between the reset transaction committing and the replay catching up, every vendor's read model is empty while the API is still serving reads from it. `VendorErasure` makes one such call today (`vendor-storefront-view`, the only projection holding PII), so the cost is bounded — but `catalogue-view` and `market-schedule-view` are now rebuildable too, and both multiply the moment a future PII-bearing projection joins that list.

Acceptable at current scale (erasure is rare, manual, and the log is small), and correctness is unaffected — the replay converges. The eventual shape is a scoped `reset(vendorId?)`, or a per-subject erasure path separate from rebuild, so an erasure touches one vendor's rows and needs no replay at all. Forced by whichever comes first: a log large enough that a full replay is slow, or an erasure volume high enough that the blank window is user-visible.

## Discovery-time orphan-checkpoint detection

*(from `POSTGRES-PLAN.md` item 3 — evidence-gated)*

A renamed `@Checkpointed('<name>')` silently orphans the old checkpoint and replays from zero. Detectable at bootstrap by diffing persisted checkpoint names against discovered ones (needs `Checkpoint.names()`; `PostgresCheckpoint` = `SELECT subscription_name`), warning on leftovers. Deferred because warn-only prevents nothing (the replay has already happened by the time it logs), the trigger (renaming a checkpoint) is rare, and the one dangerous variant — a renamed *processor* silently auto-replaying side effects — this wouldn't stop anyway. Revisit if a checkpoint is ever actually renamed, or if the processor-auto-replay gap becomes worth a real guard.

## Per-event dead-lettering with a durable attempt count

*(from `POSTGRES-PLAN.md` item 4 — when a poison event bites)*

A throwing event never advances the checkpoint → replays forever (backoff only slows it). Resolution when needed: retry K times, then record the event to a durable dead-letter table (`global_position` + attempt count + error, next free migration number) and advance past it. **Kind-aware:** skip-and-advance is safe for a *projection* (stale reads, recoverable via `rebuild`), wrong for a *processor* (silently drops a business command with no replay recovery — the rebuild guard refuses processors); processors want freeze-and-alert, not skip. The DLQ needs monitoring — silent DLQ = silent data loss. Near-term value is the alert, not the table: detection already works (`logger.error` + Honeycomb error span; 1:1 event-type→consumer mapping identifies the stuck consumer), and the push-alert design is specced in `O11Y-PLAN.md` "Stuck-subscription alert". Deferred until there's evidence of a real poison event.

## Lock-free appends

*(from `POSTGRES-PLAN.md` item 6, the `pg_snapshot_xmin` composite cursor — rewritten 2026-10-29 after M6's baseline; only if append throughput bottlenecks)*

**Trigger.** Appends sustained above ~50/s, or p99 append latency climbing in Honeycomb. Under ADR 0028's advisory lock the measured ceiling is ~155–165 appends/s at a 1.7 ms round trip and ~480 direct, set by the ~2.5 round trips an append makes inside the lock, not by fsync (M6, *Baseline*). Ordering's Saturday-noon estimate is ~10/s.

**First, two small levers inside the lock** (~1.4× at 1.7 ms, TypeScript only):
- Check the stream before taking the lock, with `MAX(stream_position)`. The `(stream_id, stream_position)` unique index catches a writer that slips in between; `SerializedAppend` maps that violation to `ConcurrencyError`. The lock is held ~1.5 round trips instead of ~2.5.
- In `PollingSubscription`, advance the checkpoint before handling, so a processor's append is the last statement before `COMMIT`.

**Then: a capped high-water mark, with no NOTIFY.** Drop the advisory lock and migration 0002's NOTIFY trigger; NOTIFY serialises the commits of notifying transactions on a database-wide lock held through the WAL flush. Measured without both: ~1,300–1,400 appends/s at 1.7 ms, bound by the pool, and ~2,700–3,100 direct (M6, *Without the global lock*).
- Appends take no global lock; the unique index alone guards streams.
- One agent per API instance computes the high-water mark H every ~100 ms: the highest `global_position` below which no gap is open. Subscriptions read `global_position > checkpoint AND global_position <= H`, and the agent pokes them whenever H advances. It watches H, not `max(global_position)`: a gap filling below the head doesn't move the max. The agent replaces ADR 0030's LISTEN/NOTIFY: no trigger, no dedicated LISTEN connection, no reconnect logic.
- A gap open longer than 3 s is skipped (Marten's async daemon uses the same default). The skip is safe because `transaction_timeout = '2s'` (Postgres 17+) is set on the app's database role, so a gap's owner is dead before its gap is skipped. Migrations lift the cap in their own session.
- The cap can't interrupt a commit already flushing: a disk stall longer than the 1 s margin could still land a row below H. The agent remembers the positions it skipped and looks them up for some minutes afterwards; a hit alerts, and the affected projections are rebuilt.
- Cost: each rollback gap — a race on the unique index, a processor transaction aborting after its append — freezes every subscription for ~3 s. It needs an ADR replacing 0028 and 0030, and container tests for gaps, rollbacks, the timeout and the late-arrival alarm; `InMemoryEventStore` has no gaps to test.

**Considered and set aside:**
- The `(transactionId, position)` composite cursor, ADR 0028's first rejection: it widens every port; the `pg_snapshot_xmin` cut-off is database-wide, so any long transaction stalls every consumer; and a transaction's id comes from its first write, so a stream can be read out of order.
- Exact gap resolution — note the in-flight transactions when a gap is first seen, skip it once all have ended: no freeze, but it needs a transaction id forced before every append, and its race windows are microseconds wide.
- A sequencer — appends insert unnumbered rows, one writer numbers committed rows into an insert-only `event_positions` table: exact by construction, no freezes, at the cost of a component and a table. The choice if the freezes ever matter.
- NOTIFY moved after commit and debounced in the app: millisecond pokes across instances, but it needs an after-commit hook in `PostgresUnitOfWork`. Only if 100 ms of poke latency ever matters.
