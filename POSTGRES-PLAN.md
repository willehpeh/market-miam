# Database — Remaining Work

The event-store build is **done and proven live** — this plan now tracks what's
left on the database: read-model persistence, crypto-shredding, and ops safety
nets. Consolidated from `PLAN.md`, `docs/DEFERRED.md`, and `O11Y-PLAN.md`.
Prioritised: **read models can't be deferred; crypto-shredding needed very soon.**

## Already done (baseline — see git history)

`PostgresEventStore` (advisory-lock append + `load`/`loadFrom`), `PostgresCheckpoint`,
`PostgresNotifications` + `TracingPostgresNotifications` (LISTEN/NOTIFY), migrate-on-boot,
`EventSourcingModule.forRoot('postgres' | 'memory')`. Schema: `events` + `checkpoints`
(migrations `0001`, `0002`). Proven live on real pg 18: `POST /api/vendors` →
`VendorRegistered` → (processor) `StorefrontOpened`, checkpoints advancing, LISTEN connected.

## Conventions carried forward (locked)

- Raw `pg` + hand SQL, no ORM (Kysely *maybe* on the read side).
- Migrations: `node-pg-migrate` in `database/migrations/` (next free number: **`0003`**), copied into the `dist` bundle, applied on boot.
- Tests: adapter **contract suites under Testcontainers**, one `nx test:container test` target; the fast suite stays in-memory via `forRoot('memory')`.
- Append-only trigger is **events-only** — read-model and `data_keys` tables allow mutation/DELETE.
- Persistence swap lives at the composition root: `forRoot('postgres')` wires pg adapters, `'memory'` wires in-memory. No test overrides.

## Suggested order

`1` (read models) → `2a` (shredding decorator + DataKeys) → `5` (replay) → `2b` (erasure flow, needs 1+5) → `3` → `4` → `6`.

---

## 1. PG read-model adapters + transactional projection↔checkpoint  — NEXT

Read models are still in-memory (`InMemoryVendorStorefrontViews`) → lost on restart, and
the projection's view write and `checkpoint.write` are **non-atomic** (`DEFERRED.md`
"Checkpoint/views transaction boundary": a crash between them duplicates or skips the event).

- **Schema (`0003`):** view table(s) — `vendor_storefront_views` (`vendor_id` PK, `name`/`description`/`phone`/`image_reference`). Generalise per read model (`catalogue_view` too, once its projection is wired). Mutable.
- **PG view-store adapter** implementing `VendorStorefrontViewStore` (write: `open`/`setCoverPhoto`/`editInformation` as upserts) + `VendorStorefrontViews` (read: `findByVendor`). **Add `clear()` to `VendorStorefrontViewStore`** (needed by replay/erasure; `catalogue-view.store` already has it). Contract-test both surfaces under Testcontainers.
- **Transactional projection↔checkpoint (the hard part):** the view write and `checkpoint.write` must commit in **one pg transaction**. Resolution (`DEFERRED.md`): an ambient **unit-of-work** — a per-poll pg transaction (AsyncLocalStorage) that the pg view-store *and* pg checkpoint both enlist in; `PollingSubscription` wraps `handle` + `checkpoint.write` in the UoW **for projections**. Processors are already at-least-once-safe (idempotent aggregate), so the tx boundary is a projection concern — decide whether to also wrap processor checkpoints. Rejected alt: idempotent upserts make reprocessing safe but leave the checkpoint-skip window → prefer the tx. Likely widens the `Subscription`/`Checkpoint` contract to carry a tx context.
- **Wire apps/api:** `forRoot('postgres')` provides the pg view-store; `'memory'` keeps `InMemoryVendorStorefrontViews`.
- **Test:** crash-between simulation (throw after view write, before checkpoint) → no double-apply, no skip.

## 2. Crypto-shredding — `ShreddingEventStore` + `DataKeys`  — SOON (ADR 0025)

Encrypt registered PII fields with a per-vendor data key held outside the log; erase by
deleting the key. Full design: ADR 0025 + `docs/VENDOR_REGISTRATION_AND_PII.md`.

**2a — encrypt/decrypt (standalone, can land first):**
- **`DataKeys` port + pg adapter** (`data_keys` table, migration `0004`): per-vendor key, envelope-encrypted (env master key now, KMS later). DELETE-able, **not** under the append-only trigger — `shred(vendorId)` deletes the key. (The `0001` comment already anticipated "`data_keys` must allow DELETE".)
- **`ShreddingEventStore` decorator** around `EventStore`/`Events`, driven by a **declarative per-event PII field registry** — the domain stays encryption-unaware. AES-256-GCM (Node `crypto`). Encrypt registered fields on append (mint the vendor key on first use); decrypt on load; a shredded key → fields read back **`null`**. Subject = `vendorId`-from-metadata.
- **Decoration order:** shredding sits closest to the store (encrypt just before persist / decrypt just after load), inside `MessageContext`/`Tracing`; add to the `forRoot('postgres')` chain.
- **Shredded streams stay loadable:** keep PII out of aggregate `apply` where possible; where it must rebuild in `apply`/a projection, tolerate `null` — a narrow exception to ADR 0007's fail-loud rule, shreddable fields only.

**2b — erasure flow (depends on 1 + 5):** `DataKeys.shred(vendorId)` + **rebuild projections** (replay, item 5, against the pg read-model adapters, item 1) + delete the Auth0 user. Read models purge for free via replay.

## 3. Discovery-time orphan-checkpoint detection  — safety net

A renamed `@Checkpointed('<name>')` silently orphans the old checkpoint and replays from
zero. Now detectable against the pg `checkpoints` table: at bootstrap, diff **persisted
names vs discovered names**, flag leftovers ("checkpoint `X` has no projection — renamed or
removed?"). Needs the `Checkpoint` port to **enumerate names** (`names(): Promise<string[]>`;
`PostgresCheckpoint` = `SELECT subscription_name`; in-memory has nothing to orphan).
`Subscriptions` warns/fails-loud on orphans at startup.

## 4. Per-event dead-lettering with a durable attempt count  — when a poison event bites

`PollingSubscription.poll` already carries the dead-letter seam: a throwing event never
advances the checkpoint → replays forever (backoff only slows it). Resolution
(`DEFERRED.md` "Poison events"): retry K times, then record the event to a durable
**dead-letter table** (`global_position`/`id` + attempt count + error, migration ~`0005`)
and advance the checkpoint past it. Fail-loud until then; the DLQ **needs monitoring**
(silent DLQ = silent data loss). Deferred until there's evidence of a real poison event.

## 5. Replay mechanism + processor replay-safety  — dependency of crypto erasure

Rebuild a projection = **`clear()` its view store, reset its checkpoint to 0, let the poller
replay** (`DEFERRED.md` "Replay strategy"; projection logic is append-only, so replay starts
clean). **Guard:** processors are **not** replay-safe — re-dispatching commands re-runs side
effects — so the runner must **refuse replay for `kind === 'processor'`** (`DEFERRED.md`
"distinguishing…", still-deferred replay-safety). An ops operation over pg checkpoints + view
tables. Pulled up because **crypto erasure (2b) rebuilds projections through it.**

## 6. `pg_snapshot_xmin` composite cursor  — only if throughput bottlenecks

The advisory-lock serialisation ceilings at ~300–1000 appends/s (ADR 0028). If ever
exceeded: batch events per append, partition the lock per stream-category, or move to a
`(transactionId, position)` composite cursor (widens the `Checkpoint`/`Events` ports).
Conditional — no action until measured.

---

## Stays in `DEFERRED.md` (not database work)

- **`vendorIdFrom` validation** — metadata cast in the domain/plumbing, not storage.
- **Client-supplied idempotency** — a command-layer front-gate; its dedup store *would* be pg, but it's trigger-gated on a non-idempotent *relative* mutation / non-repeatable side effect that doesn't exist yet. Pull it here when that lands.
- **O11Y per-type attribute extractors** — observability (`O11Y-PLAN.md` step 4).

## Cross-doc cleanup

`PLAN.md` backlog **#1 (persistent store) is complete**; its #4 list ("checkpoint/views txn
boundary, poison events, orphan detection, processor replay safety") now lives here. Update
`PLAN.md` / `DEFERRED.md` to point here (or drop the migrated items) so there's one source of truth.

## Cadence

Small steps; pause after each for review / change / commit. Commit to `main`, scoped per
logical change. Every adapter gets a contract suite under Testcontainers; the composition-root
swap keeps the fast suite in-memory.
