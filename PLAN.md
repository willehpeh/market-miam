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

## Verification gap (read before trusting "it works")

In production we can currently confirm only that the request returns 2xx — **we
cannot observe that an event was actually created**: the store is in-memory (no
query surface, lost on restart) and Layer 2 spans (which would show the command
on a trace) aren't built yet. So "registration works" is unproven beyond the
HTTP status until persistence or tracing lands.

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
2. **Subscription / processor wrapper** (ADR 0026) — the async continuation
   context seam: `correlationId` inherited from the consumed event,
   `causationId` = the event's id. Decide here whether continuation events point
   at the transient command id or the triggering event id.
3. **Layer 2 — OTel spans** — child spans on command/query dispatch and store
   append; `traceparent` into `MessageContext` (persistable projection only,
   never the live span); span *links* for async consumers; `processing.lag_ms`
   as the read-model freshness SLO. Verified with `InMemorySpanExporter`.
4. Remaining `docs/DEFERRED.md` items (polling loop, checkpoint/views txn
   boundary, poison events, client-supplied idempotency, replay strategy).

## Sequencing note

The post-login journey is the immediate next step (user-signalled, completes the
registration UX, restores the guard). But **persistence (#1) is the most
valuable platform step** — it's what makes registration durable and observable.
Reasonable to do the journey first, then persistence; or persistence first if
proving real registration matters more than the UX loop.
