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
`VendorRegistered` → (processor) `StorefrontOpened`, checkpoints advancing, LISTEN connected. Durable decision records: ADR 0029 (persistence stack), ADR 0030 (LISTEN/NOTIFY).

## Conventions carried forward (locked)

- Raw `pg` + hand SQL, no ORM (Kysely *maybe* on the read side).
- Migrations: `node-pg-migrate` in `database/migrations/` (next free number: **`0004`** — `0003` = `data_keys`), copied into the `dist` bundle, applied on boot.
- Tests: adapter **contract suites under Testcontainers**, one `nx test:container test` target; the fast suite stays in-memory via `forRoot('memory')`.
- Append-only trigger is **events-only** — read-model and `data_keys` tables allow mutation/DELETE.
- Persistence swap lives at the composition root: `forRoot('postgres')` wires pg adapters, `'memory'` wires in-memory. No test overrides.

## Suggested order

`0` (prod cutover) → **`2a` ✓** (shredding + DataKeys) → **`1` ✓** (read models — code-complete; local-verify + deploy pending) → `5` (replay, **NEXT**) → `2b` (erasure flow, needs 1+5) → `3` → `4` → `6`.

---

## 0. Prod cutover — ship what's built  — the durability payoff, do first

Everything under "Already done" is proven **locally** (Docker pg 18); it isn't
durable in prod until deployed and verified against the Render `event-store`.

- **Deploy + verify:** merge to `main` → Render auto-deploys `api`; migrate-on-boot creates the schema on the Render DB. Confirm a command → event **survives an app restart** in prod.
- **SSL:** the Pool is `new Pool({ connectionString })` with no `ssl`. Render's *internal* connection string may connect fine — confirm; an external / `sslmode=require` string needs `ssl` config or the first query fails on boot.
- **Connection budget:** the Pool (default `max` 10) + the dedicated LISTEN client + the migrate connection all draw on `basic-256mb`'s cap. Set `Pool({ max })` explicitly, sized under the instance limit.
- **Backup / PITR:** the event log is the source of truth — confirm Render's backup/retention covers it before real data lands.

## 1. PG read-model adapters + transactional projection↔checkpoint  — **DONE** (code-complete; local-verify + deploy pending)

**Shipped** (commits `66a902d` sentinel → `5f108c7`): everything below — `PostgresVendorStorefrontViews`
+ migration `0004`, `clear()` on the port + both adapters, the `UnitOfWork` port + `PostgresUnitOfWork`
+ `Queryable`, `PostgresCheckpoint` on `Queryable`, `MarketDaysModule.forRoot(persistence)`, and the
Testcontainers social test proving atomic `handle`+`checkpoint`. Fast 270 + container 58 green.
**Remaining (ops, not code):** local verify (`docker compose up -d`, serve, register + edit a storefront,
restart, confirm the view survives) and deploy (Render runs `0004` on boot). Design as-built:

Read models are in-memory (`InMemoryVendorStorefrontViews`) → lost on restart; the projection's
view write and `checkpoint.write` are two separate pg transactions. The per-event loop (`handle`
then `checkpoint.write`) can only *duplicate*-apply on a crash between them (never skip —
checkpoint always follows handle), which last-write-wins upserts absorb. But a future
non-idempotent projection (a running total) would double-count → make the pair atomic.

**Transaction via a minimal ambient UoW** (a transaction boundary + shared connection, *not* the
full change-tracking pattern):
- `UnitOfWork` port (`transaction(fn)` only) + `UnitOfWork.none()` no-op, in `event-sourcing`.
  `PollingSubscription` gains a **defaulted** 4th param and wraps each event's `handle +
  checkpoint.write` in `uow.transaction(...)`. Defaulted no-op → all existing 3-arg constructions
  and tests unchanged; in-memory behaviour byte-identical.
- `PostgresUnitOfWork(pool)` is **both** the `UnitOfWork` (BEGIN/COMMIT, stashes the client in
  `AsyncLocalStorage`) **and** a `Queryable` (`query` → ALS client inside a tx, else the pool).
  One shared singleton → same ALS → one tx spans `handle` + `checkpoint.write`.
- Adapters depend on `Queryable` (`{ query }`), which **`Pool` already satisfies** → existing
  pg-adapter tests keep passing. `PostgresCheckpoint` ctor `Pool → Queryable` (field rename).
  `PostgresEventStore` **untouched** (its `loadFrom`/`read` run before the tx; `append` owns its
  advisory-lock tx).

**Schema (`0004`) + view-store:**
- `vendor_storefront_views`: `vendor_id` PK; `name`/`description`/`phone`/`image_reference` all
  `text NOT NULL DEFAULT ''`. `NOT NULL` is safe — shredded fields read back as the `SHREDDED`
  sentinel (a string), not `null` (see 2a). Mutable, no append-only trigger.
- **One concrete `PostgresVendorStorefrontViews`** (both read + write ports), hand-rolled SQL:
  `open`/`setCoverPhoto`/`editInformation` as partial upserts (`ON CONFLICT (vendor_id) DO UPDATE
  SET <own cols> = EXCLUDED…`), `findByVendor`, `clear()` (`DELETE`). **No base class** — catalogue
  is 1:many collection-management, storefront 1:1 row-upsert; only `clear()` overlaps, not worth
  abstracting.
- Add `clear()` to the `VendorStorefrontViewStore` port + `InMemoryVendorStorefrontViews`
  (`Map.clear`) now — view-only; item 5 pairs it with `checkpoint.write(0)` for replay.
- **CatalogueView: explicitly deferred.** Its projection/store exist but aren't wired in
  `MarketDaysModule` — leave a marker so it stops reading as dead code. When wired it gets its own
  concrete `PostgresCatalogueViews`.

**Wiring:** `EventSourcingModule` provides + exports the one `PostgresUnitOfWork` (pg) /
`UnitOfWork.none()` (memory); `Subscriptions` injects it → each `PollingSubscription`;
`CHECKPOINT_FACTORY` (pg) → `PostgresCheckpoint(uow, name)`. `MarketDaysModule.forRoot(persistence)`
(newly dynamic) swaps the view-store: pg → `PostgresVendorStorefrontViews(uow)`, memory →
in-memory. `app.module` → `forRoot('postgres')`, `api-test-app` → `forRoot('memory')`.

**Read-model PII = model A** (supersedes the earlier "leaning B"): the shipped decorator decrypts
on `loadFrom`, so the projection gets plaintext and the view holds **plaintext PII at rest**. B
(ciphertext-at-rest) is off the table without redesigning the decorator. Erasure = replay-after-
shred (item 5), which rewrites the view with `SHREDDED`. Cost: plaintext PII in the view + backups
until rebuilt — fine while there are no real vendors, and item 5 follows immediately.

**Tests:** (a) `vendorStorefrontViewsContract` against **both** adapters (fast in-memory +
Testcontainers pg) — open/upsert/find/clear + last-write-wins idempotency; (b) a Testcontainers
**social test** of atomic `handle`+`checkpoint` — a failure after the view write rolls **both**
back (view unchanged, checkpoint not advanced), clean retry re-applies once. That social test is
the UoW's only coverage (no isolated UoW unit test; reentrant guard dropped — nothing nests).

**Build order:** 0 sentinel (2a tweak) → 1 UoW seam (inert) → 2 `PostgresUnitOfWork`+`Queryable`
(inert) → 3 migration + view-store + contract → 4 wiring (turns pg on) → 5 social test + local verify.

## 2. Crypto-shredding — `ShreddingEventStore` + `DataKeys`  — **2a DONE**, 2b pending (ADR 0025)

Encrypt registered PII fields with a per-vendor data key held outside the log; erase by
deleting the key. Full design: ADR 0025 + `docs/VENDOR_REGISTRATION_AND_PII.md`.

**2a — encrypt/decrypt — DONE** (both `memory` and `postgres` profiles wired; encryption live in prod):
- **`DataKeys` port + pg adapter** (`data_keys` table, migration **`0003`**): per-vendor key, envelope-encrypted under a master key held outside the DB — Render **Secret File** `/etc/secrets/.env`, read off disk (not `process.env`) so env-scraping can't lift it with the DB creds; KMS later. DELETE-able, **not** under the append-only trigger — `shred(vendorId)` deletes the key. Ports: `getOrCreateKeyFor`/`findKeyFor`/`shred`. Testcontainers contract + envelope-at-rest tests.
- **`ShreddingEventStore` decorator** around `EventStore`/`Events`, driven by a **declarative per-event PII field registry** (`vendorPiiFields`: `VendorRegistered.email` + `StorefrontInformationEdited.{name,description,phone}` — sole-trader identity) — the domain stays encryption-unaware. AES-256-GCM (Node `crypto`), AAD = streamId+eventType+fieldName. Encrypt registered fields on append (mint the vendor key on first use); decrypt on load/loadFrom; a shredded key → fields read back the **`SHREDDED` sentinel** (`'<shredded>'`, a string — keeps read-model columns `NOT NULL` and value objects off the `null` path); tampered ciphertext → throws. Subject = `vendorId`-from-metadata.
- **Decoration order:** `ApplicationEventStore` composes the chain in its constructor — `Tracing(MessageContext(Shredding(leaf)))`, shredding closest to the store. Both `EventStore` and `Events` resolve through the one instance (Tracing/MessageContext widened to implement `Events` so `loadFrom` decrypts too). Identical in both profiles.
- **Read-model decryption boundary — resolved in item 1 as model A** (supersedes the earlier "leaning B"): decrypt-on-`loadFrom` gives the projection plaintext, so the storefront view holds plaintext PII at rest; erasure is replay-after-shred (item 5), which rewrites the view with `SHREDDED`. B (ciphertext-at-rest) would need the projection to see ciphertext, which the decrypt-on-`loadFrom` decorator rules out.
- **Shredded streams stay loadable:** verified that `Vendor.apply`/`Storefront.apply` never reconstruct PII value objects (the info lives only in the read model as raw strings), so a shredded stream rehydrates untouched — no VO ever sees the sentinel. A base class making string VOs *accept* `SHREDDED` was rejected: it'd weaken every PII VO's invariant for a path that doesn't occur (and strict VOs like `Email` reject the sentinel anyway). If a VO ever must be built from a shreddable field, handle the sentinel at that one site.

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

## 5. Replay mechanism + processor replay-safety  — **NEXT** (dependency of crypto erasure)

Building blocks now exist from item 1: `VendorStorefrontViewStore.clear()` (both adapters),
`Checkpoint.write(0)` for reset, and the `UnitOfWork` — so a rebuild can wrap `clear()` +
`checkpoint.write(0)` in `uow.transaction(...)` (atomic reset, crash-safe). Still to build: the
ops entry point that runs it per projection, plus the processor-replay guard below.

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
