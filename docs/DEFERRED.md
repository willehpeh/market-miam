# Deferred Decisions

Genuinely-open decisions, not yet implemented and not tracked elsewhere. Resolved/built decisions live in their ADRs, `EVENT-SOURCING-ARCHITECTURE.md`, and the code. The database build plan is complete and archived (`archive/POSTGRES-PLAN.md`); its three deferred items now live here (orphan-checkpoint detection, dead-lettering, composite cursor).

## vendorIdFrom error handling

`vendorIdFrom` currently does a raw cast with no validation. Error handling (throw if vendorId is missing from metadata) was deferred because no test drives it yet. Add when there's a failure scenario that justifies it.

## Client-supplied idempotency

Not needed yet. Natural idempotency already comes from three layers: client-supplied aggregate identity (`vendorId`, `itemId` arrive on the command), domain-level idempotency in handlers (e.g. `RegisterVendor` retains the original on re-registration), and optimistic concurrency (`expectedStreamPosition` rejects concurrent duplicates). Revisit when either appears: a non-idempotent *relative* mutation (e.g. "increment stock by 5", where a retry double-applies), or an external side effect that can't be repeated (payment capture, outbound email/SMS).

When added, it is a separate concern from causation — a distinct metadata field plus a *front gate* that dedups before the handler executes (on a hit: skip execution, append nothing, return the prior outcome). Do not reuse the causation id slot for it: the idempotency key must be stable across retries, whereas the causation id must be unique per dispatch — collapsing them corrupts lineage in exactly the retry case. The causation id stays internally generated. (A client-supplied *correlation seed* is a third, separate input: accept-external-or-generate into the `correlationId` ALS field.) If the front-gate ever needs a durable dedup store, that store is pg (a new migration + adapter, same conventions as `archive/POSTGRES-PLAN.md`).

## Subscription as a publication requirement

Publishing a storefront requires readiness (ADR 0031); once we charge vendors, an **active subscription** joins the list. Billing is a separate bounded context (a generic subdomain — plans, invoices, payment, dunning — its language does not belong in Market Days; cf. ADR 0004). Not built: not charging yet.

The seam is already shaped. Readiness is assembled by the `StorefrontPublication` domain service from symmetric self-queries; the subscription requirement enters as *one more*: `subscriptions.isActiveFor(vendor)` behind a **local entitlement read model** — a projection fed by the billing context's events (`SubscriptionActivated`/`…Lapsed` → `entitlement(vendorId, active)`). The service gains one `missing.push('subscription')`; the `Storefront` aggregate never learns the word "subscription." Do **not** put a synchronous Stripe call in the publish path — project billing events into the local entitlement instead, keeping the check a local read. Forced when the first paid plan ships.

## Scoped projection reset

`Projection.reset()` clears a projection's whole read model, but the caller that needs it — `VendorErasure` — erases a *single* vendor. So erasing one vendor deletes every vendor's rows and replays the entire log to rebuild them. Two consequences per rebuild: it costs O(entire log), and between the reset transaction committing and the replay catching up, every vendor's read model is empty while the API is still serving reads from it. `VendorErasure` makes one such call today (`vendor-storefront-view`, the only projection holding PII), so the cost is bounded — but `catalogue-view` and `market-schedule-view` are now rebuildable too, and both multiply the moment a future PII-bearing projection joins that list.

Acceptable at current scale (erasure is rare, manual, and the log is small), and correctness is unaffected — the replay converges. The eventual shape is a scoped `reset(vendorId?)`, or a per-subject erasure path separate from rebuild, so an erasure touches one vendor's rows and needs no replay at all. Forced by whichever comes first: a log large enough that a full replay is slow, or an erasure volume high enough that the blank window is user-visible.

## Discovery-time orphan-checkpoint detection

*(from `archive/POSTGRES-PLAN.md` item 3 — evidence-gated)*

A renamed `@Checkpointed('<name>')` silently orphans the old checkpoint and replays from zero. Detectable at bootstrap by diffing persisted checkpoint names against discovered ones (needs `Checkpoint.names()`; `PostgresCheckpoint` = `SELECT subscription_name`), warning on leftovers. Deferred because warn-only prevents nothing (the replay has already happened by the time it logs), the trigger (renaming a checkpoint) is rare, and the one dangerous variant — a renamed *processor* silently auto-replaying side effects — this wouldn't stop anyway. Revisit if a checkpoint is ever actually renamed, or if the processor-auto-replay gap becomes worth a real guard.

## Per-event dead-lettering with a durable attempt count

*(from `archive/POSTGRES-PLAN.md` item 4 — when a poison event bites)*

A throwing event never advances the checkpoint → replays forever (backoff only slows it). Resolution when needed: retry K times, then record the event to a durable dead-letter table (`global_position` + attempt count + error, next free migration number) and advance past it. **Kind-aware:** skip-and-advance is safe for a *projection* (stale reads, recoverable via `rebuild`), wrong for a *processor* (silently drops a business command with no replay recovery — the rebuild guard refuses processors); processors want freeze-and-alert, not skip. The DLQ needs monitoring — silent DLQ = silent data loss. Near-term value is the alert, not the table: detection already works (`logger.error` + Honeycomb error span; 1:1 event-type→consumer mapping identifies the stuck consumer), and the push-alert design is specced in `O11Y-PLAN.md` "Stuck-subscription alert". Deferred until there's evidence of a real poison event.

## `pg_snapshot_xmin` composite cursor

*(from `archive/POSTGRES-PLAN.md` item 6 — only if throughput bottlenecks)*

The advisory-lock serialisation ceilings at ~300–1000 appends/s (ADR 0028). If ever exceeded: batch events per append, partition the lock per stream-category, or move to a `(transactionId, position)` composite cursor (widens the `Checkpoint`/`Events` ports). Conditional — no action until measured.
