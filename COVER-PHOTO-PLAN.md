# Storefront cover photo upload (Cloudinary) — implementation handoff

Self-contained handoff. A fresh agent should be able to execute the remaining slices from this doc without re-exploring. Paths are repo-root-relative.

## Goal

Un-stub the disabled "Ajouter photo / Bientôt" placeholder in `apps/vendor-frontend/src/app/onboarding/storefront-form.ts` (line ~17: `imageReference isn't settable via PUT yet`). Add signed direct-to-Cloudinary photo upload + a write path that persists the reference. The backend domain for cover photos is **already fully built and wired** (command, handler, event, VO, projection, `VendorStorefrontView.imageReference`); the only gap is the HTTP write path and the whole frontend upload flow.

## Working style (respect these)

- **Incremental with review gates**: one small slice at a time, pause after each for review/commit. Do NOT blast through all slices.
- **Outside-in TDD, social tests, no mocks**; fakes/stubs only at boundaries. Assert whole event arrays (`store.newEvents()` / `store.load()`), never a single index.
- **No commits without explicit in-the-moment permission.**
- Test runner is **Vitest via Nx**. Never call vitest directly. Commands below.
- No getters/setters (behavior methods only). No explanatory comments unless the "why" is unclear. No lifecycle hooks (init work in constructor). Signal Forms on the frontend.

## Resolved decisions (do not relitigate)

| Decision | Choice |
|---|---|
| Upload auth | **Signed** — backend signs, browser uploads direct to Cloudinary |
| Stored ref | **public_id** (not secure_url) |
| public_id | **Deterministic** `storefronts/<vendorId>/cover-photo`, `overwrite=true` → no orphans, vendor scoped to own slot |
| Persist timing | **Immediately on upload** (own command/PUT); "Continuer" still only saves name/description/phone |
| Signer port | Named **`SignedUploads`** (generic to ALL vendor photo uploads, not cover-photo-specific), port + real/fake adapter |
| Upload limits | Client `accept="image/*"` + size check (UX); **signed params** enforce `allowed_formats` + `c_limit` incoming transform (trust boundary) |
| URL building | **`cloudinaryUrl` Angular pipe**, transform chosen per `<img>`; public_id stays raw in state |
| Upload UX | **Spinner + reduce-on-success** (imageReference into store on success; inline error on failure) |

Storefront is **open** by the time the form renders (opened by the `opens-storefronts` processor reacting to `VendorRegistered`; onboarding nav is gated on the view existing) — immediate persist won't throw `StorefrontNotOpenError`.

## Codebase reference

**Test commands** (Vitest, SWC; `globals: true`):
- API controller/infra tests (`apps/api/src/**/*.spec.ts`): `npx nx test api` (narrow: `npx nx test api -- <filter>`).
- Domain command tests live in the **`test/` project**, NOT in `packages/market-days`: `npx nx test test` (narrow: `npx nx test test -- <filter>`). `npx nx test market-days` does NOT exist.
- Frontend: `npx nx test vendor-frontend`.

**API social-test harness** — `apps/api/src/app/testing/api-test-app.ts`:
- `bootApiTestApp({ vendor?, clock?, signer? })` → `INestApplication`. Boots real `MarketDaysModule`, swaps `StaticTokenVerifier`, `POLLING_ENABLED=false`.
- Exports `testVendor` (vendorId `acme-bakery`), `fixedClock`, `FIXED_NOW='2026-06-23T09:00:00.000Z'`.
- `openStorefrontFor(app, vendorId)` seeds a `StorefrontOpened` event.
- Drive with `supertest`: `request(app.getHttpServer())`. Assert on events via `app.get(EventStore).load('storefront-<vendorId>')`. For read-model/view assertions: `await app.get(Subscriptions).drain()` first.

**Domain command test pattern** — `test/src/market-days/set-storefront-cover-photo/set-storefront-cover-photo.spec.ts`: build `new InMemoryEventStore()`, `store.seedWith(streamId, [priorEvents], { vendorId })`, run handler, assert `store.newEvents()` toEqual whole array of `expect.objectContaining({ type, payload })`. Colocated `test-data.ts` builder with `valid()`/`with(overrides)`.

**Already-built backend pieces to REUSE (do not rebuild)**:
- `SetStorefrontCoverPhoto(vendorId, imageReference)` command + `SetStorefrontCoverPhotoHandler` — registered in `apps/api/src/app/market-days/market-days.module.ts` `commandHandlers`. Exported from `@market-monster/market-days`.
- Event `StorefrontCoverPhotoSet`, payload `{ imageReference: string }`.
- `ImageReference` VO (`@market-monster/common`) — non-empty trimmed string.
- Projection → `VendorStorefrontView.imageReference` (already returned by `GET /api/storefront`).
- Aggregate `setCoverPhoto` is idempotent (same ref → no event) and `assertOpen()`s.

**`Clock` port** — abstract class in `packages/common/src/local-date.ts` (`today()`, `now(): Instant`). `Instant.value()` → ISO string. Real impl `DateClock`.

**Frontend conventions** (`apps/vendor-frontend/src/app/storefront/`):
- Ports = abstract classes. `Storefront` (`storefront.ts`): `view()`, `edit()` returning Observables. Adapter `HttpStorefront` (`http.storefront.ts`). Bound in `storefront.providers.ts`.
- NgRx: `storefront.state.ts` (actions + `createFeature` reducer), `storefront.effects.ts` (class-based `StorefrontEffects`), facade `storefront.facade.ts` (abstract) + `StoreStorefrontFacade` (`store.storefront.facade.ts`) + `FakeStorefrontFacade` (`fake.storefront.facade.ts`).
- `StorefrontView` already has `imageReference`.
- Environments (`src/environments/environment{,.development,.testing}.ts`) export only `apiBaseUrl`. Prod `https://api.marketmiam.fr`, dev `http://localhost:3000`, testing `''`.
- Global Auth0 HttpClient interceptor → **Cloudinary upload must use `fetch`** (do NOT leak the Auth0 bearer to Cloudinary).
- Dashboard render: `apps/vendor-frontend/src/app/dashboard/dashboard.ts` has `<img [src]="storefront.imageReference">`.

## STATUS

### ✅ Slice 1 DONE — `SignedUploads` port + adapters (folder `apps/api/src/app/signed-uploads/`)

All green (`npx nx test api -- signed-uploads`, 4 tests):
- `signed-uploads.ts` — `SignedUploads` port (`for(publicId): SignedUpload`) + `SignedUpload`/`SignedParams` types. `params` are **snake_case** (`public_id`, `allowed_formats`, …) so they byte-match the browser's Cloudinary POST.
- `cloudinary-signature.ts` (+ `.spec.ts`) — pure `cloudinarySignature(params, secret)` = SHA-1 of alphabetically-sorted `k=v` joined by `&`, secret appended. Golden-vector test: `{public_id:'sample_image',timestamp:1315060510}`+`'abcd'` → `b4ad47fb4e25c7bf5f92a20089f9db59bc302313`.
- `cloudinary-signed-uploads.ts` (+ `.spec.ts`) — `CloudinarySignedUploads` real adapter (node:crypto + `Clock` for epoch-seconds timestamp; params `overwrite/invalidate=true`, `allowed_formats='jpg,png,webp'`, `transformation='c_limit,w_2000'`). Contract test: signs exactly the params it returns.
- `fake-signed-uploads.ts` — `FakeSignedUploads` deterministic (`signature: signed(<publicId>)`).
- `signed-uploads.factory.ts` — `signedUploadsFor(config, clock)`, `getOrThrow` on `CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET`. No dev-fake branch (dev sets real creds; tests override provider).

Deviation from original plan, accepted: no dev→fake branch; module wiring deferred to Slice 2.

## REMAINING SLICES

### ✅ Slice 2 DONE — Controller routes + wiring + harness override

Green: full `npx nx test api` (36 tests) + `npx nx typecheck api`. Added barrel `apps/api/src/app/signed-uploads/index.ts`; wired `{ provide: SignedUploads, useFactory: signedUploadsFor, inject: [ConfigService, Clock] }`; harness `ApiTestOptions.signer?` defaulting to `FakeSignedUploads` (unconditional override protects all api tests); `coverPhotoPublicId` helper; `POST /storefront/cover-photo/signature` + body-less `PUT /storefront/cover-photo`; 2 social specs.

**Files:** `apps/api/src/app/market-days/storefront.controller.ts`, `apps/api/src/app/market-days/market-days.module.ts`, `apps/api/src/app/testing/api-test-app.ts`, + 2 new spec files.

1. **Harness override first** (so all existing api tests keep booting once the real factory is wired): in `api-test-app.ts` add `signer?: SignedUploads` to `ApiTestOptions`, a default `const fixedSignedUploads = new FakeSignedUploads()`, and **unconditionally** `builder.overrideProvider(SignedUploads).useValue(options.signer ?? fixedSignedUploads)`. (Override replaces the factory, so `getOrThrow` never runs in tests.)
2. **Wire the provider** in `market-days.module.ts`: `const signedUploads = [{ provide: SignedUploads, useFactory: signedUploadsFor, inject: [ConfigService, Clock] }]` (import `ConfigService` from `@nestjs/config`; ConfigModule is global). Spread `...signedUploads` into `providers` before `...commandHandlers`.
3. **Add a shared public_id helper** (used by both routes): e.g. `coverPhotoPublicId(vendorId) => \`storefronts/${vendorId}/cover-photo\`` — colocate in the controller file or a tiny module.
4. **Routes** on `StorefrontController` (inject `private readonly signedUploads: SignedUploads`; both `@UseGuards(JwtAuthGuard)` + `@CurrentVendor()`):
   - `@Post('cover-photo/signature')` → `return this.signedUploads.for(coverPhotoPublicId(vendor.vendorId.value()))`. public_id derived server-side (vendor can't forge another's slot). Returns 201.
   - `@Put('cover-photo')` **body-less** → `await this.commands.execute(new SetStorefrontCoverPhoto(vendorId, coverPhotoPublicId(vendorId)))`. Import `SetStorefrontCoverPhoto`. Re-upload → same ref → aggregate no-ops (correct).

**Social tests** (outside-in, use default `FakeSignedUploads`):
- `storefront-cover-photo-signature.spec.ts`: POST → 201, `response.body` toEqual objectContaining `{ cloudName, apiKey, signature: 'signed(storefronts/acme-bakery/cover-photo)', params: objectContaining({ public_id: 'storefronts/acme-bakery/cover-photo' }) }`.
- `storefront-cover-photo.spec.ts`: `openStorefrontFor(app,'acme-bakery')`; PUT `/storefront/cover-photo` → 200; `app.get(EventStore).load('storefront-acme-bakery')` toEqual `[objectContaining(StorefrontOpened), objectContaining({ type:'StorefrontCoverPhotoSet', payload:{ imageReference:'storefronts/acme-bakery/cover-photo' } })]`.

**Gate:** `npx nx test api` fully green (existing tests must still pass — the harness override is what protects them).

### ✅ Slice 3 DONE — Cloudinary config/env

Added `CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET` to `apps/api/.env.example` (documented) and `render.yaml` api service (all three `sync: false`, set in Render dashboard). Local `apps/api/.env` needs the real values or the API won't boot (`getOrThrow`).

**Files:** `apps/api/.env.example`, `render.yaml`.
- `.env.example`: add `CLOUDINARY_CLOUD_NAME=`, `CLOUDINARY_API_KEY=`, `CLOUDINARY_API_SECRET=` with a one-line comment.
- `render.yaml`: add the three under the api service env; `CLOUDINARY_API_KEY` + `CLOUDINARY_API_SECRET` as `sync: false` (dashboard secrets), `CLOUDINARY_CLOUD_NAME` may be plain.
- No test (config only). Gate: quick review.

### ✅ Slice 4 DONE — `cloudinaryUrl` pipe + dashboard render

Green: `npx nx test vendor-frontend` (40 tests). `CloudinaryUrlPipe` in `core/cloudinary-url.pipe.ts` (empty publicId → `''`); dashboard `<img>` uses `| cloudinaryUrl: 'c_fill,w_1200,h_600'` + `[alt]="storefront.name"`. **Pulled `cloudinary: { cloudName }` forward into all 3 environment files** (prod/dev `du7bhdijj`, testing `test-cloud`) — so Slice 7 no longer needs the env change.

### Slice 4 (original notes) — `cloudinaryUrl` pipe + dashboard render

**Files:** new `apps/vendor-frontend/src/app/core/cloudinary-url.pipe.ts` (+ `.spec.ts`), `apps/vendor-frontend/src/app/dashboard/dashboard.ts`.
- Standalone pipe `cloudinaryUrl`: `transform(publicId: string, options: string): string`. Empty/falsy publicId → `''` (avoids broken `<img>`). Else `https://res.cloudinary.com/<cloudName>/image/upload/<options>/<publicId>` using `environment.cloudinary.cloudName` (added in Slice 7).
- Unit test: empty → `''`; a public_id + `'c_fill,w_1200,h_600'` → exact expected URL.
- Update dashboard `<img>` to `[src]="storefront.imageReference | cloudinaryUrl:'c_fill,w_1200,h_600'"` (import the pipe into the component's `imports`).
- Gate: `npx nx test vendor-frontend -- cloudinary-url`.

### Slice 5 — Frontend upload port + `Storefront` port extension

**Files:** `apps/vendor-frontend/src/app/storefront/` — new `photo-uploads.ts` (port), `cloudinary.photo-uploads.ts` (adapter), `fake.photo-uploads.ts` (fake); edit `storefront.ts`, `http.storefront.ts`, `storefront.providers.ts`.
- Frontend `SignedUpload` type mirroring the backend response (cloudName, apiKey, signature, params{...}). Define in `storefront.ts` (or a shared file).
- `PhotoUploads` port (generic, matches backend generalization): `abstract upload(file: File, signed: SignedUpload): Observable<{ publicId: string; secureUrl: string; version: number }>`. *(Naming: `PhotoUploads` suggested; confirm with user — parallels backend `SignedUploads`.)*
- `CloudinaryPhotoUploads` adapter: build `FormData` (`file`, `api_key`, `signature`, + every `params` entry), POST to `https://api.cloudinary.com/v1_1/<cloudName>/image/upload` via **`fetch`** (bypasses Auth0 interceptor), map response `{ public_id, secure_url, version }`. Wrap in `from(...)`/`defer` for the Observable.
- `FakePhotoUploads` for tests.
- Extend `Storefront` port: `coverPhotoSignature(): Observable<SignedUpload>` (POST our API `/api/storefront/cover-photo/signature`), `setCoverPhoto(): Observable<void>` (PUT our API `/api/storefront/cover-photo`, body-less). Implement in `HttpStorefront`. Bind `PhotoUploads → CloudinaryPhotoUploads` in `storefront.providers.ts`.
- Tests: adapter FormData/URL shape can be asserted with a fake fetch; `HttpStorefront` new methods via `HttpTestingController`.
- Gate: `npx nx test vendor-frontend`.

### Slice 6 — Frontend upload state / effect / facade

**Files:** `storefront.state.ts`, `storefront.effects.ts`, `storefront.facade.ts`, `store.storefront.facade.ts`, `fake.storefront.facade.ts`.
- Actions: `UploadCoverPhoto({ file })`, `UploadCoverPhotoSuccess({ imageReference })`, `UploadCoverPhotoFailure`.
- Reducer: add `coverPhotoUploading: boolean` (+ `coverPhotoError` flag). `UploadCoverPhoto` → uploading true; success → set `view.imageReference` (reduce-on-success — the save UX the `editStorefront$` comment flags as missing) + uploading false; failure → uploading false + error.
- Effect `uploadCoverPhoto$`: on `UploadCoverPhoto` → `storefront.coverPhotoSignature()` → `switchMap` `photoUploads.upload(file, signed)` → `switchMap` `storefront.setCoverPhoto()` → `map(() => UploadCoverPhotoSuccess({ imageReference: signed.params.public_id }))`; `catchError` → `UploadCoverPhotoFailure`. Inject `PhotoUploads`.
- Facade: add `uploadCoverPhoto(file: File): void` (dispatch), `coverPhotoUploading: Signal<boolean>` (+ error signal). Implement in store facade (select signals) and fake facade (writable signals for tests).
- Tests: effect test (signature→upload→persist→success; failure path) using fakes; reducer test for uploading/imageReference transitions.
- Gate: `npx nx test vendor-frontend`.

### Slice 7 — Un-stub `storefront-form.ts` + env cloudName + component test

**Files:** `apps/vendor-frontend/src/app/onboarding/storefront-form.ts` (+ spec), `src/environments/environment{,.development,.testing}.ts`.
- Add `cloudinary: { cloudName: '...' }` to the three environment files (public value; testing a stub like `'test-cloud'`).
- Replace the disabled block (lines ~17-26) with: hidden `<input type="file" accept="image/*" (change)=...>` triggered by the button; client-side size check (reject > ~10MB, show message); call `storefront.uploadCoverPhoto(file)`; spinner while `storefront.coverPhotoUploading()`; preview `<img [src]="view.imageReference | cloudinaryUrl:'c_fill,w_400,h_300'">` when present; inline error on failure. Remove the line-17 ponytail comment. Keep it Signal Forms-consistent; photo is separate from the name/description/phone form model.
- Component test with `FakeStorefrontFacade` (+ fake upload wiring): picking a file calls `uploadCoverPhoto`; spinner shows while uploading; preview renders after success; error shows on failure.
- Gate: `npx nx test vendor-frontend`.

### Slice 8 — Verify end-to-end

- `npx nx test api` + `npx nx test test` + `npx nx test vendor-frontend` all green.
- Manual: set `CLOUDINARY_*` in `apps/api/.env` and `cloudName` in `environment.development.ts`; run api + vendor-frontend; register vendor → onboarding → storefront; pick photo → spinner → preview; reload → persists; re-upload different image → replaces same asset (`storefronts/<vendorId>/cover-photo` in Cloudinary console).

## Known ceilings (ponytail — flagged, not solved)

- **CDN staleness on replace**: overwrite + stable versionless URL → browser may show the cached old image after re-upload. Mitigation in place: sign `invalidate=true`; in-session preview uses the upload response's `secureUrl` (carries version) for instant feedback. Upgrade path: store `version` alongside public_id if instant global freshness is needed.
- **Deep-link/hard-refresh** to `/onboarding/storefront` bypasses the load gate (only `authenticated` guards it); backend storefront almost certainly already open from a prior session. Optional hardening: resolver/guard on `LoadStorefrontSuccess`. Out of scope unless requested.

## Open naming question for next agent

Frontend browser→Cloudinary uploader port name: suggested `PhotoUploads` (parallels backend `SignedUploads` generalization). Confirm with user before committing to it.
