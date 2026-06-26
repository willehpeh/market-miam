# Plan

Living plan for the vendor registration vertical slice and the surrounding
platform work (ADR 0026 observability, persistence). Updated as steps land.

## Where we are

The vendor registration path is wired **end to end**:

- **Frontend** (`vendor-frontend`, static SPA): `HttpVendor.register()` posts to
  `${environment.apiBaseUrl}/api/vendors` (per-environment build-time URLs:
  prod `https://api.marketmiam.fr`, dev `localhost:3000`, testing relative).
  Registration fires reactively on `LoginSuccess`.
- **Auth0**: configured (`provideAuth0`, audience = the API). Access-token
  interceptor (`authHttpInterceptorFn`) attaches the bearer token to API calls
  **in production only** (`isDevMode()` gate); dev is fully faked (`FakeAuth`).
- **API** (`apps/api`): `POST /api/vendors` is auth-guarded (`JwtAuthGuard` +
  `@CurrentVendor()`); `vendorId`/`email` come from the verified vendor,
  `registeredAt` from the server `Clock` (`DateClock`). A global middleware
  establishes the root **message context** so the appended `VendorRegistered`
  event carries `correlationId` + `causationId`. CORS enabled for the frontend
  origins (live as of this deploy).
- **Store**: in-memory only (`InMemoryEventStore`) — events do **not** survive a
  restart. All four ports (`EventStore`, `Events`, `Checkpoint`, `Subscription`)
  have adapter-agnostic contract tests.
- **Storefront slice** (in progress): `PUT /storefront` (`EditStorefrontInformation`)
  produces `StorefrontInformationEdited`; `VendorStorefrontViewProjection` (marked
  `@CheckpointedProjection('vendor-storefront-view')`) is **discovered and driven
  by the `ConsumerRunner`** — a background RxJS poller (`merge`→`repeat`/`retry`,
  per-subscription isolation) over checkpoint-driven, instrumented subscriptions,
  gated by `POLLING_ENABLED` (off in tests, which pump `drain()`). A lint rule
  enforces that every concrete `*Projection` carries the decorator. Remaining:
  query endpoint, frontend.
- **Module structure**: the generic event-sourcing infra (message context,
  decorated store, `Events`, `CommandDispatcher`, the `ConsumerRunner`) now lives
  in **`EventSourcingModule`**, extracted from the `MarketDaysModule` god-module;
  `MarketDaysModule` imports it and holds only domain wiring.
- **Observability** (ADR 0026): producer + consumer tracing are live end to end
  (dispatch / append / load spans, `traceparent` in event metadata, consumer
  new-trace + link + `processing.lag_ms`). See `O11Y-PLAN.md`.

## Verification gap (read before trusting "it works")

Tracing now shows the command **and** its append on a trace (Layer 2 is live),
so a request is observable beyond its 2xx. The remaining gap is **durability**:
the store is in-memory, so events are lost on restart and there is no
cross-restart record. Persistence (Postgres) closes this.

## Storefront slice — remaining ("B")

The producer→projection loop works, is traced, and is driven by a real poller
(**B.1 `ConsumerRunner` — done**: decorator-discovered subscriptions, RxJS poll
loop, duplicate-checkpoint guard, fully tested). What's left:

1. **`GET /storefront` query endpoint** — reads `VendorStorefrontViews`; builds
   the deferred **`QueryDispatcher`** (span-only — see `O11Y-PLAN.md`).
2. **Frontend** — storefront edit form + display ("something to show").

Eventual-consistency note: the projection is async, so after an edit the read
model updates only once `poll()` runs — the frontend must tolerate that lag
(refetch / optimistic update). Decide when building the frontend.

## Storefront opening — the first processor (agreed slice)

Grilled and settled. This is the write-side prerequisite to "B": it makes "every
vendor has a storefront" a **fact in the event log** and lands the platform's
first **processor** (backlog #2). The read-side (`GET`, frontend) follows.

**Domain decision.** A storefront is a facet of the vendor: one-to-one, born at
registration, no independent lifecycle (you don't close a storefront while
keeping the vendor). Multiple-storefronts-per-vendor is *theoretical* and
**deferred** — we stay vendorId-keyed (`storefront-${vendorId}`, single
storefront). If multiplicity ever becomes real it's *additive* (introduce
`storefrontId` + an `OpenAdditionalStorefront` command), not a rewrite, because
we'll already have a real `StorefrontOpened` event to evolve.

**Shape.** Creation is an explicit event — not a projection-fold, not a
synchronous step inside registration:

```
VendorRegistered → [StorefrontOpener] → OpenStorefront → StorefrontOpened
                                                   → [projection creates the empty view]
```

The processor crosses streams (vendor → storefront); the projection stays
storefront-only (`StorefrontOpened`, `StorefrontInformationEdited`,
`StorefrontCoverPhotoSet`) and no longer needs to know about `VendorRegistered`.

**Decisions:**

- **Dispatch, don't reach into the repo.** The processor dispatches
  `OpenStorefront` (one-event-per-command); `OpenStorefrontHandler` drives the
  `Storefront` aggregate. Requires a new **abstract command-dispatch port** in
  `event-sourcing` so the `market-days` processor stays OTel-free; the existing
  `apps/api` `CommandDispatcher` becomes that port's instrumented adapter
  (mirrors the `EventStore`/`Events`/`Checkpoint` port pattern).
- **Idempotency lives in the aggregate.** `Storefront.open()` is a no-op if
  already opened (like `setCoverPhoto`'s `sameAs` guard) — `expectedStreamPosition`
  alone can't stop a *logical* duplicate, so a redelivered `VendorRegistered`
  must be absorbed by the aggregate. Makes processor redelivery/replay harmless.
- **Edits assert-opened.** `editInformation`/`setCoverPhoto` throw if the
  storefront isn't opened (fail-loud; protects "every storefront is born by
  `StorefrontOpened`"). Safe because edits run on the synchronous command path —
  a throw fails one request, it can't jam the shared poller. The registration→open
  lag can't bite the edit UX because read-before-edit gates it: the form needs
  the loaded view, which only exists after `StorefrontOpened` is projected.
- **Continuation context** (resolves backlog #2's open question): the processor
  establishes a new `MessageContext` with `correlationId` **inherited** from the
  consumed event's metadata and `causationId` = the **consumed event's id**
  (`event.id`). The transient command has no id in the lineage. (This is the
  `DEFERRED.md` answer; the "command id vs event id" question is closed.)
- **Read surface goes pure.** `VendorStorefrontViews` exposes
  `findByVendor(vendorId): Promise<VendorStorefrontView | undefined>` — no side
  effect. `findOrCreateForVendor` leaves the read interface (it was a write-path
  upsert in a read's clothes); the empty view is *materialized* by
  `StorefrontOpened`, not synthesized on read. `undefined` means "not projected
  yet" (consistency lag), never "this vendor has none."
- **Lag is the frontend's job.** No server-side `GET` retry — it'd be prod-only,
  untestable under the `drain()` harness, and would couple read latency to
  consumer health. Frontend refetches for the registration window and uses
  optimistic update for the more-frequent edit window.
- **Naming:** `OpenStorefront` / `StorefrontOpened` / `StorefrontOpener`
  (checkpoint `'storefront-opener'`) — one concept, three grammatical forms.

**Discovery + lint.** Handlers are detected by the **`implements` clause**, not
the name suffix: `implements Projection` / `implements Processor` is the
structural truth (the existing rule's own comment already notes projections only
`implements Projection`). Refactor `event-sourcing/projection-decorator` to key
on `node.implements?.some(i => i.expression?.name === 'Projection')` instead of
`node.id.name.endsWith('Projection')`, and add a sibling `processor-decorator`
rule (`implements Processor` ⇔ `@CheckpointedProcessor`). Abstract bases stay
skipped (`node.abstract`). The name suffixes remain as convention but are no
longer load-bearing for the lint.

**How it's driven (outside-in).** You don't test-drive the port — it has no
behaviour of its own, it's a seam extracted under green. The slice is driven by
one required behaviour: *registering a vendor opens an empty storefront.* The red
test is social — `POST /api/vendors`, `drain()`, assert `findByVendor(vendorId)`
returns the empty view — and making it pass forces the whole chain
(`StorefrontOpener` → `OpenStorefront` + handler → `StorefrontOpened` → projection
creates the view). The **abstract port appears only when the implementation hits
the purity wall** (the `market-days` processor must dispatch but must not import
the OTel-coupled `apps/api` dispatcher); it's a refactor, validated by the
*existing* dispatcher tests + typecheck + the module-boundary lint, not by a new
red test. Lineage (`correlationId` inherited, `causationId` = the
`VendorRegistered` id) is asserted on the stored `StorefrontOpened` metadata in
the same social test, so the continuation-context wrapper is covered by
observable outcome, not in isolation. Idempotency (`open()` no-op) and
assert-opened are pure-aggregate behaviours with their own direct tests (no
mocks). The chain is **two-hop async** (`VendorRegistered` → processor →
`StorefrontOpened` → projection), so `drain()` must pump to a **fixpoint** across
both subscriptions; the driving test surfaces it immediately if it doesn't.

**End-state pieces (dependency order — what exists once the behaviours are green,
not the order you build in):**

1. **Abstract command-dispatch port** (`event-sourcing`); `apps/api` dispatcher
   implements it.
2. **`OpenStorefront` + handler + `StorefrontOpened`**; `Storefront.open()`
   (idempotent) + `apply(StorefrontOpened)` setting `_opened`; edits assert-opened.
3. **`StorefrontOpener`** (`market-days`, `implements Processor`,
   `@CheckpointedProcessor('storefront-opener')`) → dispatches `OpenStorefront`.
4. **`ConsumerRunner`**: discover processors; wrap with continuation-context
   (inherited correlation, causation = event id) + tracing. (Pin the
   wrapper/tracing layering — the command span under the consumer trace — per
   ADR 0026's "bounded processor→command fan-out".)
5. **`VendorStorefrontViewProjection`**: handle `StorefrontOpened` → create the
   empty view; switch the read surface to pure `findByVendor`.
6. **Lint refactor** (both rules key on `implements`) + the new processor rule.
7. **Docs**: close backlog #2's open question; update `DEFERRED.md` (a processor
   now exists) and `O11Y-PLAN.md` (continuation context live).

Then the read side ("B"): `QueryDispatcher` + `GET /storefront`, then frontend.

## Next overall step — complete the post-login journey

After login, the vendor should land in a protected area (the registration
already fires on `LoginSuccess`). This also brings back the **deferred auth
guard**, now that there's a route to protect.

1. **A protected vendor route + component** (e.g. a vendor home/dashboard) —
   currently routes are just `''` → public `Landing`.
2. **Login redirect** — on `LoginSuccess`, navigate from landing into the
   protected route.
3. **Auth guard** — protect the vendor route; send unauthenticated users back to
   landing/login.

### Open decisions (grill before building)

- **Guard mechanism**: Auth0 `authGuardFn` (built-in, prod-only — consistent
  with the interceptor decision) **vs** a port/facade-based guard using
  `AuthFacade.isAuthenticated` (works in dev+prod, testable with `FakeAuth`).
  Note this differs from the interceptor case: the guard reasons about auth
  *state* (already abstracted by the facade), not the raw token — so the
  port-based option is more defensible here. Decide deliberately.
- **Redirect mechanism**: an NgRx effect on `LoginSuccess` that navigates, vs
  Auth0 `appState`/redirect-callback targeting.
- **Dev story**: if the guard is prod-only, dev routes are unprotected (fine,
  faked); if port-based, the guard runs in dev too via `FakeAuth`.

## Backlog (roughly sequenced)

1. **Persistent store (Postgres)** — the biggest gap; prod loses data on restart.
   Drop-in behind the `EventStore`/`Events`/`Checkpoint` ports; held to the
   existing contract suites (sibling specs). Gap-handling (MVCC global-position
   gaps) is Postgres integration-test territory, not the shared contract — see
   `docs/DEFERRED.md`. Closing this also closes the verification gap above.
2. **Processor continuation context** (ADR 0026) — now being built as part of
   the **StorefrontOpener** slice above (the platform's first processor). When a
   processor dispatches a follow-up command it establishes a new message context
   with `correlationId` inherited from the consumed event and `causationId` =
   the consumed event's id (`event.id`). The "transient command id vs triggering
   event id" question is **resolved**: the event id (the transient command has no
   id in the lineage), per `DEFERRED.md`.
3. **Layer 2 — OTel spans** — **done** (dispatch / append / load spans,
   `traceparent` in event metadata, consumer new-trace + link +
   `processing.lag_ms`). Only per-type attribute extractors remain deferred. See
   `O11Y-PLAN.md`.
4. Remaining `docs/DEFERRED.md` items — the polling loop is now built
   (`ConsumerRunner`); still open: checkpoint/views txn boundary, poison events,
   Postgres global-position gaps, discovery-time orphan-checkpoint detection,
   `@CheckpointedProcessor` + continuation context, client-supplied idempotency,
   replay strategy.

## Sequencing note

The post-login journey is the immediate next step (user-signalled, completes the
registration UX, restores the guard). But **persistence (#1) is the most
valuable platform step** — it's what makes registration durable and observable.
Reasonable to do the journey first, then persistence; or persistence first if
proving real registration matters more than the UX loop.
