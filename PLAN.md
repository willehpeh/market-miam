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
  produces `StorefrontInformationEdited`; `VendorStorefrontViewProjection` runs
  behind an in-memory `Subscription` (driven by `poll()`) to build the read model.
  Remaining: poller, query endpoint, frontend — see "Storefront slice — remaining".
- **Observability** (ADR 0026): producer + consumer tracing are live end to end
  (dispatch / append / load spans, `traceparent` in event metadata, consumer
  new-trace + link + `processing.lag_ms`). See `O11Y-PLAN.md`.

## Verification gap (read before trusting "it works")

Tracing now shows the command **and** its append on a trace (Layer 2 is live),
so a request is observable beyond its 2xx. The remaining gap is **durability**:
the store is in-memory, so events are lost on restart and there is no
cross-restart record. Persistence (Postgres) closes this.

## Storefront slice — remaining ("B")

The storefront producer→projection loop works and is traced. What's left to make
it a full, demonstrable vertical slice:

1. **Background poller** — `onApplicationBootstrap` driving the subscription's
   `poll()` on a schedule (drain-then-wait cadence; fixed interval, no jitter
   pre-Postgres). `poll()` stays the deterministic, test-pumped unit; the poller
   is thin timer glue. Workers / leasing / jitter are Postgres + multi-instance era.
2. **`GET /storefront` query endpoint** — reads `VendorStorefrontViews`; builds
   the deferred **`QueryDispatcher`** (span-only — see `O11Y-PLAN.md`).
3. **Frontend** — storefront edit form + display ("something to show").

Eventual-consistency note: the projection is async, so after an edit the read
model updates only once `poll()` runs — the frontend must tolerate that lag
(refetch / optimistic update). Decide when building the frontend.

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
2. **Processor continuation context** (ADR 0026) — the subscription itself is
   done (projection side). Still open: when a **processor** dispatches a
   follow-up command, establish a new message context with `correlationId`
   inherited from the consumed event and `causationId` = the event's id. No
   processor exists yet. Open: does a continuation command's `causationId` point
   at the transient command id or the triggering event id?
3. **Layer 2 — OTel spans** — **done** (dispatch / append / load spans,
   `traceparent` in event metadata, consumer new-trace + link +
   `processing.lag_ms`). Only per-type attribute extractors remain deferred. See
   `O11Y-PLAN.md`.
4. Remaining `docs/DEFERRED.md` items (polling loop, checkpoint/views txn
   boundary, poison events, client-supplied idempotency, replay strategy).

## Sequencing note

The post-login journey is the immediate next step (user-signalled, completes the
registration UX, restores the guard). But **persistence (#1) is the most
valuable platform step** — it's what makes registration durable and observable.
Reasonable to do the journey first, then persistence; or persistence first if
proving real registration matters more than the UX loop.
