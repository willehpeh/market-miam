# Onboarding Launch Plan

Post-login launch flow for new vendors. On login we prepare the vendor's storefront, then route by its state: empty → welcome, any info → the vitrine form. Landing holds a loading state during preparation and an error+retry on failure. Design from [`docs/design/Miam Espace vendeur.pdf`](docs/design/Miam%20Espace%20vendeur.pdf) p1 (screens 1–2); theme already in `apps/vendor-frontend/src/assets/miam-theme.css`.

**Status:** designed (grill complete), *not started*. Pausing before first red. Storefront edit surface (`Storefront.edit` / `StorefrontFacade.save` / `PUT /api/storefront`) + a combined `Onboarding` component already landed in a prior step and get **split/reworked** below.

## Behaviour — destination map
Single signal: the `StorefrontView` (`name`, `description`, `imageReference`), all from `GET /storefront`.
- **empty** (all three blank) → `/onboarding` (Welcome).
- **any field set** → `/onboarding/storefront` (Vitrine form, prefilled).
- **future** (needs a `published` flag the API lacks): any info + *unpublished* → form; *published* → `/dashboard`. Until then `/dashboard` is **not** a login destination.

## Launch chain
`registerOnLoginSuccess$` stays in `vendor.effects` (vendor owns registration). New `OnboardingEffects` owns everything from `RegisterVendorSuccess` on.

1. `LoginSuccess` → reducer sets `preparing`; `vendor.effects` fires `RegisterVendor` → `POST /vendors` (idempotent — `Vendor` aggregate guards `alreadyRegistered()`, so re-login/refresh is safe, no duplicate `StorefrontOpened`).
2. **Gate:** `RegisterVendorSuccess` → `LoadStorefront` → `GET /storefront`. GET 404-retries (existing `STOREFRONT_RETRY`, 10×1s) absorb the registration→projection lag; returning vendors return immediately.
3. `LoadStorefrontSuccess` → navigate `['/onboarding']` vs `['/onboarding','storefront']` off `view` emptiness (read from the action payload); reducer → `ready`.
4. `RegisterVendorFailure` **or** `LoadStorefrontFailure` → reducer `failed` + `errorCode` (HTTP status). Landing shows error+retry.
5. `RetryOnboarding` → reducer `preparing`, re-dispatch `RegisterVendor` (restarts the whole gated chain).

The wait is exactly one thing: `LoadStorefront` reaching a terminal outcome. No separate await on the POST — the GET retry covers "opening".

Refresh is not a hole: `auth.effects` `session$` re-fires `LoginSuccess` once Auth0 restores the session, re-running the chain on any hard reload.

## State machine (`onboarding` slice)
`status: 'idle' | 'preparing' | 'ready' | 'failed'`, `errorCode?: number`.

| on | → |
|----|---|
| `LoginSuccess`, `RetryOnboarding` | `preparing` (clear `errorCode`) |
| `LoadStorefrontSuccess` | `ready` |
| `RegisterVendorFailure`, `LoadStorefrontFailure` | `failed` (`errorCode` from action) |

Landing reads it via `OnboardingFacade` (`preparing`, `errorCode`, `retry()`).

## Routes (`app.routes.ts`)
```ts
{ path: 'onboarding', canActivateChild: [authenticated], children: [
  { path: '', component: Welcome },              // empty
  { path: 'storefront', component: StorefrontForm },// has-info
]},
{ path: 'dashboard', component: Dashboard, canActivate: [authenticated] },
{ path: '', component: Landing },
```
Componentless parent — guard declared once. No shell component (welcome/form share no chrome); children render in the app-root outlet. A parent component with its own `<router-outlet>` is the move *only* when the multi-step wizard chrome ("ÉTAPE 1 SUR 4") arrives.

## New slice: `onboarding/`
Mirrors the `storefront`/`vendor` feature shape.
- `onboarding.state.ts` — `status`+`errorCode`, action `RetryOnboarding`, `createFeature` reducer reacting to the cross-feature actions in the table.
- `onboarding.effects.ts` — `loadOnRegistered$` (`RegisterVendorSuccess → LoadStorefront`); `navigateOnLoaded$` (`LoadStorefrontSuccess → router.navigate(...)`, `{dispatch:false}`); `retry$` (`RetryOnboarding → RegisterVendor`).
- `onboarding.facade.ts` (abstract) + `store.onboarding.facade.ts` + `fake.onboarding.facade.ts` — `preparing: Signal<boolean>`, `errorCode: Signal<number|undefined>`, `retry(): void`.
- `onboarding.providers.ts` → `provideOnboarding()`, wired in `app.config.ts`.

## Touched (existing)
- `vendor.state.ts` / `vendor.effects.ts` — `RegisterVendorFailure` carries `{ status }` (`catchError((e: HttpErrorResponse) => …)`).
- `storefront.state.ts` / `storefront.effects.ts` — `LoadStorefrontFailure` carries `{ status }`.
- `storefront.facade.ts` + impls — **prune `load()`** (dead once components stop self-loading; effects dispatch the `LoadStorefront` action directly). `save()`/`edit`/`PUT` stay.
- `dashboard.ts` — drop `ngOnInit`/`OnInit`/`load()`; dumb reader of `view`.
- `landing.ts` — add `preparing` spinner + `failed` error(code)+`Réessayer`; depends on `OnboardingFacade` + `AuthFacade`.
- `auth.effects.ts` — **delete `redirectOnLogin$`** (navigation now happens on storefront-loaded, not on login). `redirectOnLogout$` stays.
- Delete combined `onboarding/onboarding.ts` + `onboarding.spec.ts` → split into `Welcome` + `StorefrontForm`.

## Components (all dumb — no lifecycle hooks)
Convention: **no lifecycle hooks anywhere.** A genuine init-time load goes in the **constructor**, never `ngOnInit`. Here nothing self-loads.
- `Welcome` — static intro + `routerLink="/onboarding/storefront"` on "Créer ma vitrine". (Welcome copy/feature-list from the prior combined component.)
- `StorefrontForm` — the form from the prior component minus welcome/loading branches and `creating`/`ngOnInit`. Prefill via `linkedSignal(() => storefront.view()?.name ?? '')` etc.; `save()` on submit. All 5 fields; photo/ville/téléphone disabled ("bientôt").

## Tests (facade is the pivot)
**Component layer — real component vs fake facade:**
- `landing.spec` — vs `FakeOnboardingFacade`+`FakeAuthFacade`: anonymous→login button; `preparing`→spinner; `failed`+`errorCode`→error text incl. code, `Réessayer`→`facade.retry()`.
- `storefront-form.spec` — vs `FakeStorefrontFacade`: prefill from `view`, `save()` on submit, ville/téléphone disabled (adapt existing `onboarding.spec`).
- `welcome.spec` — routerLink target.

**Integration layer — real facades+store+effects+services → `HttpTestingController`, fake only Auth0 port (`FakeAuth`):**
- `onboarding.launch.spec` — login → flush `POST /vendors` → flush `GET /storefront` empty ⇒ `router.url==='/onboarding'`, `status==='ready'`; has-info ⇒ `/onboarding/storefront`; `GET` 500 ⇒ `failed`/`errorCode`; `retry()` re-drives `POST`/`GET`. Override `STOREFRONT_RETRY` `{delayMs:0,maxAttempts:1}`.
- `storefront.spec` — keep GET/retry coverage but drive via `store.dispatch(LoadStorefront())` (not `facade.load()`, pruned). PUT test stays.
- `app.spec` — **delete** the dashboard-redirect test.

## Copy (French, tweakable)
- Spinner: e.g. "Nous préparons votre stand…" (reuse).
- Failure: **Impossible de préparer votre stand** — "Une erreur est survenue (code {{ errorCode }}). Réessayez, et si le problème persiste, contactez votre contact chez Miam." · button **Réessayer**.

## Gotchas
- **Reducer-before-effect ordering:** NgRx runs reducers before effects for the same action. Since no component self-loads, `LoadStorefront` is dispatched *only* by the launch, so `navigateOnLoaded$` firing on every `LoadStorefrontSuccess` is inherently once-per-launch — **no status gate needed now.** If a future non-launch `LoadStorefront` is ever added (refresh button, reload-after-save), gate `navigateOnLoaded$` on the *pre-reducer* `preparing` — do it by dispatching an explicit `OnboardingReady` from the effect rather than flipping `ready` in the reducer on `LoadStorefrontSuccess` (else `withLatestFrom(status)` reads the already-flipped `ready`).
- `errorCode` = HTTP status. Upgrade path if we want Honeycomb-traceable: a correlation id from an error header (more plumbing).

## Deferred
- **Deep-link / manual `/` while already authenticated** (no fresh `LoginSuccess`) → spinner with no trigger. Rare; fix is a "resume session" path. Not now.
- **`published` flag** → `/dashboard` as a login destination.
- **Multi-step wizard** (design steps 2–4: catalogue, etc.) + parent shell component.
- **Photo** persistence — design-only; `imageReference` not settable via `PUT`. (Phone shipped: real optional field via Signal Forms + `PUT`; ville dropped from the form.)
