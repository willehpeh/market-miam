# Plan

Living plan for the vendor-registration vertical slice + platform work
(persistence, observability). Sub-plans: `POSTGRES-PLAN.md`, `O11Y-PLAN.md`,
`docs/DEFERRED.md`. Shipped design rationale lives in the commits, code, and ADRs.

## Where we are

Vendor registration is wired end to end and **durable**:

- **Frontend** (`vendor-frontend`): `register()` → `POST /api/vendors`, fires on `LoginSuccess`; Auth0 (bearer in prod, faked in dev); guarded `/dashboard` after login (port/facade guard over a three-value `AuthStatus`). Dashboard renders the storefront via `GET /api/storefront` with a bounded 404-retry that absorbs projection lag.
- **API** (`apps/api`): auth-guarded `POST /api/vendors`, `PUT /storefront`, `GET /storefront`; a root message context stamps `correlationId`/`causationId` on appended events.
- **Store**: **Postgres in prod, in-memory in tests** — `EventSourcingModule.forRoot('postgres' | 'memory')`; `PostgresEventStore` + `PostgresCheckpoint` + LISTEN/NOTIFY + migrate-on-boot, proven live. The four ports (`EventStore`/`Events`/`Checkpoint`/`Subscription`) have adapter-agnostic contract tests.
- **Storefront slice**: registering a vendor opens their storefront — `StorefrontOpener` (`@CheckpointedProcessor`) reacts to `VendorRegistered` → `OpenStorefront` → `StorefrontOpened` → `VendorStorefrontViewProjection` materialises the view. Discovered and driven by the `Subscriptions` background poller (`POLLING_ENABLED`-gated; tests pump `drain()`); a lint rule enforces `implements` ⇔ decorator.
- **Observability** (ADR 0026): producer + consumer tracing live end to end — `O11Y-PLAN.md`.

## Load-bearing decisions (still in force)

- **Storefront = a facet of the vendor**: one-to-one, born at registration, `storefront-${vendorId}`-keyed. Multiplicity is deferred and *additive* (`storefrontId` + `OpenAdditionalStorefront`), not a rewrite.
- **Processor idempotency lives in the aggregate** (`Storefront.open()` no-ops if already opened) so redelivery/replay is harmless; **edits assert-opened** (fail-loud, on the synchronous command path).
- **Continuation context**: a processor inherits `correlationId` from the consumed event and sets `causationId` = that event's id.
- **Read surface is pure**: `findByVendor` returns `undefined` for "not projected yet"; the empty view is materialised by `StorefrontOpened`, never synthesised on read. **Lag is the frontend's job** — no server-side `GET` retry.
- **Instrumentation only wraps the bus + store/subscription adapters**; domain packages stay OTel-free (ADR 0026).

## Remaining

- **Storefront edit form** — the last read-side piece, wired to `PUT /storefront` (tolerate projection lag: refetch / optimistic update).
- **Database** (biggest) — PG read models (priority), crypto-shredding (soon), ops safety nets → `POSTGRES-PLAN.md`.
- **Observability** — per-type intent/outcome attributes, deferred until a safe-payload command dispatches in prod → `O11Y-PLAN.md`.
- **Open decisions** — `vendorIdFrom` validation, client-supplied idempotency → `docs/DEFERRED.md`.
