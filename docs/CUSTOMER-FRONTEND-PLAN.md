# Customer Frontend — Public Storefront (vitrine)

Per-vendor public storefront at `{subdomain}.votreplateforme.fr`, rendering one vendor's storefront, catalogue, and upcoming markets. App: `apps/customer-frontend` (Angular SSR). Design: `docs/design/customer-frontend-1.png`, `-2.png`, `-show-dish.png`. Outside-in social TDD, thin vertical slices, backend-first ([[feedback_testing_approach]], [[feedback_incremental_steps_review_gates]]).

## Architecture (resolved)

**No new persisted read model or projection.** The page composes existing/planned persisted read models at read time behind one public endpoint. The only new server state is a subdomain→vendor lookup table.

| Screen region | Source | Status |
|---|---|---|
| Header/footer — name, tagline, phone, cover | `VendorStorefrontViews.findByVendor` | built, reused — **wired (slice 1)** |
| NOTRE CARTE — dishes | `CatalogueViews.forVendor` | built, reused — **wired (slice 2)** |
| PROCHAINS MARCHÉS | `FindUpcomingMarketDays(vendorId)` | built, reused — **wired (slice 3)**: folded into the public composite + PROCHAINS MARCHÉS list |
| subdomain → vendorId | `subdomain_registry` table | **built (slice 1)** |

Composition: `GET /public/storefront/:subdomain` (public, no auth) resolves the subdomain, fans out to the three read models, returns one `CustomerStorefront` result — **a discriminated union** gated on publication (`published` | `coming-soon`), or 404 (see Publication gate). SSR fetches a single URL. Read-time compute is confined to the start-time cutoff; everything else is a view read.

## Subdomain resolution

- `subdomain_registry(subdomain TEXT PRIMARY KEY, vendor_id TEXT NOT NULL UNIQUE)` — `subdomain` PK is both the reservation guard and the resolution lookup; stored lowercase, normalized (`.toLowerCase()`) at the api boundary (DNS is case-insensitive). `vendor_id UNIQUE` = one subdomain per vendor, so `removeFor` is deterministic.
- **Authoritative write-model table, not a projection** — not rebuilt from events. A projection would reintroduce the uniqueness race the unique index exists to prevent.
- **No event, no command in v1. Rows manually seeded.** A `SubdomainAssigned` event + reservation-on-command arrive only when a vendor chooses/renames their URL — that command's handler writes the table and emits the event together. Until then the table is the sole authority; only the writer evolves (operator → command → vendor), never the table.
- Resolution: `SELECT vendor_id WHERE subdomain = $1`; miss → 404.
- Erasure ([[project_vendor_erasure_scope]], ADR 0025): `SubdomainRegistry.removeFor(vendorId)` is wired into `VendorErasure.erase()` (**new work, slice 1** — the registry is a new table erasure didn't previously know) → row deleted → storefront 404s. No SHREDDED-sentinel guard in the customer handler; row deletion is the sole defence. Without it the rebuilt storefront view renders the `<shredded>` sentinel (`name/phone = '<shredded>'`) on a public page.

## DTO

```
CustomerStorefront =
  | { status: 'published';
      name, description, phone,
      coverPhoto?,                               // raw Cloudinary public-id — frontend builds the URL (see Image refs gotcha)
      dishes: CatalogueViewItem[],               // passed through verbatim: { itemId, name, description, price (cents), imageReference ('' = none) }
      upcomingMarkets: [{ date, weekday, marketName, startTime?, endTime?,
                          street?, postalCode, town, pitch? }] }
  | { status: 'coming-soon'; name: string | null }   // resolves but unpublished; 404 = unresolved (see Publication gate)
```

- Discriminated union on `status`; the frontend branches (published page / coming-soon page / `null`→introuvable). Only `published` carries the rich fields.
- `upcomingMarkets` = `FindUpcomingMarketDays` occurrences, minus in-progress (start-time cutoff below), first ~5.
- Image fields (`coverPhoto`, dish `photo`) are raw Cloudinary public-ids, not URLs — the frontend builds delivery URLs (no server-side builder exists).

## Publication gate (ADR 0031)

A storefront is public only once the vendor **publishes** it — a deliberate go-live, gated on readiness. Full rationale in ADR 0031; the shape:

- **`published` is a state on the `Storefront` aggregate** (`StorefrontPublished`). Vendor intent, not "data happens to exist."
- **Readiness is a cross-aggregate policy → the stateless `StorefrontPublication` domain service** (not the aggregate reaching across boundaries). Synchronous; an async request/confirm processor was rejected (it would only wrap the same reads). Each aggregate answers neutral self-queries; the service owns the required set + reason words and assembles `missing[]`:

  | Contributor | Query | Reason |
  |---|---|---|
  | Storefront | `hasTitle()` / `hasDescription()` / `hasCoverPhoto()` | `title` / `description` / `cover` |
  | Catalogue | `hasAtLeastOneItem()` | `catalogue` |
  | Calendar | `hasAtLeastOneSchedule()` | `schedule` |

- **`Storefront.publish()` guards only local rules** (open, idempotent) + raises the event; the service gates readiness → `StorefrontNotReadyToPublish(missing)` (extends `DomainError` → 400 with reasons). Thin handler: load storefront/catalogue/calendar, delegate, save the storefront (one aggregate mutated, one event — ADR 0009).
- **Cover mandatory to publish, not to edit** — consistent with description (`StorefrontDescription` allows empty, so `hasDescription()` checks content, not a fired flag). Readiness ≠ validity; the gate is in the service, never the VOs.
- **Read gate**: the composite returns the discriminated union — 404 (subdomain unresolved) / coming-soon (resolves, unpublished; title if set, `noindex`) / published — on a `published` flag projected into `vendor-storefront-view`. Erasure already deletes the subdomain row → an erased vendor is 404, not coming-soon (correct).
- **Subscription** (once charging): one more self-query behind a local entitlement projection — deferred, `docs/DEFERRED.md`.

## Decisions (don't re-litigate)

- **Reuse over refold.** The customer view composes the three persisted read models; no read-time event-store fold, no bespoke customer projection. The three sources have no cross-join in v1 (menu chips cut), so their independent lag composes one page without inconsistency (ADR 0002).
- **Markets read the shared model, not a customer BFF expansion.** Expansion + retraction (cancel/skip) live once in `FindUpcomingMarketDays`. A BFF expansion off the Calendrier view was **rejected**: it duplicates the `Schedule` VO cadence math and — without cancel/skip — asserts false future attendance on a customer surface (a shopper sent to an empty pitch). Buys no performance either: `FindUpcomingMarketDays` also expands at query time.
- **Start-time cutoff is customer-side presentation.** Drop occurrences whose start (`date` + `startTime`, hardcoded `Europe/Paris`) has passed. The in-progress window belongs to a future active-market-day interface (MarketDay "in progress" lifecycle); vendor reads of the same model keep in-progress days, so this filter stays in the customer layer, not the read model. `Europe/Paris` is a single-region calibration constant → becomes a `Market` timezone attribute when multi-region.
- **Menu chips per market: cut.** Cards show date/market/hours/address only — no "Menu à venir" placeholder (nothing behind it). The dish↔market-day join is the separate prepared-state overlay slice (`docs/MARKET-SCHEDULE-PLAN.md`).
- **PROCHAIN MARCHÉ hero card: cut.** The mockup's separate "next market" hero is not built (ignore it in the mockup) — the PROCHAINS MARCHÉS list stands alone; its first entry is the next market. No `nextMarket` field, nothing derives `[0]`.
- **Categories + tags: cut.** Domain has neither; deferred as `ItemAddedToCatalogue` v2 (`docs/CATALOGUE-PLAN.md`). Dish card + modal show name/description/price/photo only.
- **Dish detail modal: no endpoint.** Opens client-side from `dishes[]`; "Disponible les jours de marché…" is static copy, not a data field.
- **404 on unresolved subdomain; coming-soon on unpublished** (see Publication gate). For a *published* storefront: empty catalogue/schedule → empty arrays; missing cover can't happen (cover is a publish requirement).
- **Composite query, thin controller.** One `FindCustomerStorefront(subdomain)` handler injects the `SubdomainRegistry` port + the view ports, resolves then composes the DTO, returns `undefined` on miss; `PublicStorefrontController` is one `execute()` + `null→404`. Subdomain resolution is a plain port method (`vendorFor`), **not** its own CQRS query. Fan-out + the start-time cutoff live in the handler, not the controller.
- **Angular, not Astro.** Astro — already in the monorepo (`apps/website`) and a better raw fit for a static vitrine — was considered and **rejected**: the near-term roadmap (semi-real-time dish availability, then ordering + payment) makes this a transactional, stateful app, which is Angular's wheelhouse and consistent with `vendor-frontend`'s NgRx/Signal-Forms stack. Astro would need an island framework bolted in and likely a later rewrite. The CSS design system is portable either way, and `render.yaml` already wires the customer SSR node service.

## Dependency

**Slice 3 (markets) is no longer blocked** (verified 2026-07-15 against the code). The `docs/MARKET-SCHEDULE-PLAN.md` §"Upcoming market days" dependency shipped: read half (`FindUpcomingMarketDays` — real cadence expansion over a 56-day horizon + absence flagging, tested at every layer incl. a Postgres container) and write half (`CancelMarketSchedule` retires a whole schedule; **`DeclareAbsence`** — the plan's provisional "SkipMarketDay" — skips a day or range, single day = `from == to`). What remains is slice 3's own composition, **not** a market-schedule prerequisite: `FindUpcomingMarketDays` is exposed only on the vendor-authed `GET /market-schedules/upcoming`, so the public composite must fold it in (reuse the handler's expansion, don't duplicate). All three slices can now proceed independently.

## Build order — vertical tracer-bullet slices, outside-in TDD, review gate each

**Slice 1 — resolve + storefront (the tracer bullet). ✅ Shipped** — built in order 1 → 2 → 4 → 3, plus a dev seed; five commits (registry · endpoint · erasure · SSR · dev seed). Proven live at `localhost:4200/?subdomain=demo`.
1. `subdomain_registry` migration (DDL only — empty table, PK + `UNIQUE(vendor_id)`; **no seed**, rows hand-inserted per env) + `SubdomainRegistry` port (`vendorFor`/`removeFor`) with Postgres/InMemory adapters.
2. `GET /public/storefront/:subdomain` acceptance (RED): 404 on miss → storefront-view fields on hit. Public, exempt from the vendor auth guard.
3. SSR: Angular resolver injects `REQUEST` → `Host` → subdomain (first-label split; `?subdomain=` fallback on localhost) → fetch → render header/footer. Response → TransferState via `provideClientHydration`; add `customer-frontend` env for `apiBaseUrl`.
4. Erasure: extend `vendor-erasure.spec` — erased vendor's subdomain no longer resolves; add the `removeFor` call to `VendorErasure`.

Proves the whole pipe DNS→SSR→api→resolve→view→render, thinnest path.

**Slice 2 — catalogue. ✅ Shipped** — four commits (endpoint · resolver view model · dish list + sheet · seed/publish).
5. Extend endpoint/DTO with `CatalogueViews.forVendor` dishes — passed through verbatim, published branch only.
6. Frontend: resolver maps the DTO to a view model at the edge (no NgRx in customer-frontend) — built Cloudinary URLs (`photo: { cardUrl, sheetUrl } | null`), `priceLabel` via a copied `formatEuros`. NOTRE CARTE list + dish sheet as a native `<dialog>` opened imperatively in the click handler (`selected.set(dish); sheet.showModal()` — no `effect()`); no-photo dishes render text-only (placeholder deferred to the styling pass). jsdom lacks `<dialog>` methods — two-line `showModal`/`close` polyfill in `test-setup.ts`.
The seed now also registers a weekly demo schedule (Saturday 09:00–13:00, from today) and publishes — the demo renders the full published storefront; the schedule stays invisible until slice 3.

**Slice 3 — markets. ✅ Shipped** — backend fold (committed) + frontend PROCHAINS MARCHÉS list.
7. ✅ **Shipped (backend)** — folded `upcomingMarkets` into the public `CustomerStorefront` by injecting `FindUpcomingMarketDaysHandler` into the composite (reused its expansion, no duplication). Customer-side handling: **start-time cutoff** (drop occurrences whose `date`+`startTime` has passed in `Europe/Paris`, computed via `Intl` `formatToParts` + `hourCycle:'h23'`), then first 5, mapped to a flat `UpcomingMarket` DTO (renamed/flattened, internal `scheduleId`/`marketId` stripped). **Absent days are kept, flagged `cancelled: true`** (from the occurrence's `absent`) — a declared-absence day keeps its calendar slot but the frontend renders it as cancelled, rather than vanishing. Acceptance test extended (fold+shape+cutoff+slice, absent→cancelled); also cleared the spec's pre-existing `object[]`→`DomainEvent[]` seed-helper typecheck errors.
8. ✅ **Shipped (frontend)** — resolver maps `upcomingMarkets` DTO → `MarketViewModel` at the edge (French weekday/month/day badge parts keyed off the DTO's `weekday` + date string — no `Date` parsing/tz drift; `hours` = `8h – 13h30` and `address` = `street, town` as **separate fields, rendered on two lines**; arrondissement/postal omitted). Static `<li>` cards (no dialog) under a PROCHAINS MARCHÉS section. Cancelled markets render the **whole card in greys** — a `bg-neutral-100` surface + a `grayscale` filter desaturating the badge background (the warm palette has no neutral greys; the filter also sidesteps binding a `bg-brand/10` slash class), with all card text dropped to a lighter `text-neutral-500`, plus a `line-through` name and an "Annulé" pill — so a cancelled market is obviously off. Resolver + page specs extended. No separate "next market" hero card (cut — see Decisions).

**Slice 4 — publication gate (ADR 0031). ✅ Shipped** (steps 9–13; step 14 pending). Domain (cycles 1–8), API (`POST /storefront/publish`), read gate + `published` projection, and the coming-soon frontend are all live. The demo was left unpublished until slice 2, which seeded dishes + a schedule and published it.
9. `Storefront`: store name/description in `apply`; `hasTitle()`/`hasDescription()`/`hasCoverPhoto()`; `publish()` (open + idempotent, raises `StorefrontPublished`). Add `StorefrontDescription.hasContent()`, `CoverPhoto.isSet()`. Aggregate tests.
10. Sibling readiness: `Catalogue.hasAtLeastOneItem()`, `Calendar.hasSchedule()`. Tests.
11. `StorefrontPublication` service + `PublishStorefront` command/handler (vendor-authed): assemble `missing`, throw `StorefrontNotReadyToPublish` (→400) or publish. Acceptance test — not-ready → 400 + reasons; ready → `StorefrontPublished`.
12. Project `StorefrontPublished` → `vendor-storefront-view.published`; `FindCustomerStorefront` returns the discriminated union (404 / coming-soon / published). Extend the public-endpoint acceptance test for all three states.
13. Frontend: resolver union → `ComingSoonPage` + `StorefrontPage` branch, `noindex` on coming-soon. Render the cover `<img>` (built URL; `NgOptimizedImage` later). `seedDev` already sets description + cover (`v1784235195/demo-cover_ghvwt5`); the dish + schedule + publish seed is **deferred to slices 2 & 3** (demo stays coming-soon until then).
14. (Own slice, later) Vendor-frontend publish button surfacing the missing-reasons.

**Publish-storefront TDD cycles** — steps 9–11's write side is driven outside-in by one social spec (`test/src/market-days/publish-storefront/publish-storefront.spec.ts`); the aggregate, VO, service and command emerge together, one RED→GREEN per cycle:
- [x] 1 — not-ready storefront → `StorefrontNotReadyToPublish` (tracer: command/handler/service/`hasTitle()`/error)
- [x] 2 — title set, empty description → not ready (`hasDescription()` + `StorefrontDescription.hasContent()` + apply `StorefrontInformationEdited` storing name/description)
- [x] 3 — no cover → not ready (`hasCoverPhoto()` + `CoverPhoto.isSet()`)
- [x] 4 — no dishes → not ready (handler loads `Catalogue` + `hasAtLeastOneItem()`)
- [x] 5 — no schedule → not ready (`Calendar.hasAtLeastOneSchedule()` — `hasSchedule(id)` was taken)
- [x] 6 — all met → `StorefrontPublished` emitted (`StorefrontPublication` calls `Storefront.publish()`; empty payload — vendorId is in metadata per the mutation-event convention)
- [x] 7 — re-publish → single event (idempotent: `_published` applied from `StorefrontPublished`, `publish()` no-ops)
- [x] 8 — full `missing[]` = `[title, description, cover, catalogue, schedule]` + vendorId metadata (`expectVendorScopedEvents`)

**API surface (step 11) shipped:** `PublishStorefrontHandler` + `StorefrontPublication` registered in `market-days.module.ts`; vendor-authed `POST /storefront/publish` (`@HttpCode 204`) on `storefront.controller.ts`; `StorefrontNotReadyToPublish → 400` via the existing `DomainErrorFilter` (reasons in the message). Acceptance test `storefront-publish.spec.ts` (not-ready → 400 + reasons; ready → 204).

**Steps 12–13 shipped:** `StorefrontPublished` projects into `vendor-storefront-view.published` (migration 0008, both adapters); `FindCustomerStorefront` returns the discriminated union (404 / coming-soon / published); frontend renders published shell · `ComingSoonPage` (`noindex`) · introuvable. The demo stayed coming-soon until slice 2 published it. **Next: slice 3 (markets).**

## Gotchas / open

- **Public route must bypass the vendor auth guard.** Verify the guard's scoping and confirm `/public/storefront/:subdomain` doesn't collide with existing controller routes when building slice 1.
- **Dev subdomains.** Wildcard DNS (`*.votreplateforme.fr`) is provisioned for prod; on `localhost` (Host carries no subdomain) the resolver falls back to a `?subdomain=` query param. `DEV_SUBDOMAIN` env deferred — avoids `process.env` plumbing in SSR/browser-shared code; add only if the query param gets tedious. The api never reads `Host` — it always receives a real `:subdomain` param.
- **PII on a public surface by design.** storefront-view name/description/phone are shown (phone in the footer). Shredded vendor handled by erasure deleting the subdomain row, not a view guard.
- **Image URLs.** No server-side URL builder exists (only `vendor-frontend`'s `cloudinary-url.pipe`). The DTO returns raw Cloudinary public-ids (`imageReference`); the customer-frontend builds delivery URLs client-side, mirroring that pipe ([[project_cover_photo_upload]]). Keeps multiple transforms per image (card thumb vs modal) available for slice 2; `cloudName` is public.
- **Open — read-model overlap.** `FindUpcomingMarketDays` and the Calendrier view store near-identical rows (schedule snapshot keyed `(vendorId, scheduleId)`); a one-model/two-queries consolidation is possible but touches shipped Calendrier code — deferred to `docs/MARKET-SCHEDULE-PLAN.md`.
- **Dev seed.** `seedDev(app)` (`apps/api/src/app/dev-seed.ts`, `NODE_ENV=development` / memory profile only) opens a `demo-vendor` storefront and registers the `demo` subdomain after `listen`, so `localhost:4200/?subdomain=demo` renders with no manual seeding. Opens the storefront directly (not via `RegisterVendor`) so the `OpensStorefronts` processor never races `drain()` under polling. Never runs on postgres/prod. **Slice 2:** the seed adds 3 dishes (one photoless, proving the no-photo branch), a weekly Saturday schedule (start = boot date, never stale), and `PublishStorefront` — `?subdomain=demo` renders the full published storefront. **Slice 3:** the seed also declares an absence over the 2nd upcoming Saturday (`upcomingSaturday(1)`, UTC-matched to the expansion), so the demo shows one market flagged cancelled.
- **Cover image.** Now a **publish requirement** (ADR 0031), so a published storefront always has one; rendered in slice 4 from the built Cloudinary URL (customer-frontend needs `cloudinary.cloudName` in its env, mirroring vendor-frontend). `NgOptimizedImage` + `provideCloudinaryLoader` is a later LCP refinement.

## Status & next steps

**All four slices shipped.** Slice 1: subdomain registry, public endpoint, erasure row-deletion, SSR storefront tracer, dev seed. Slice 4: the full publication gate (ADR 0031) — readiness domain service, `POST /storefront/publish`, `published` projection, discriminated-union read gate, and the coming-soon page. Slice 2: dishes on the public endpoint, resolver view-model mapping, NOTRE CARTE list + native-dialog dish sheet, and the seed published the demo. Slice 3: `upcomingMarkets` folded into the public composite (start-time cutoff, first 5, absent→`cancelled`) + the PROCHAINS MARCHÉS list (date badge, hours/address, cancelled treatment).

Possible next steps (unordered):
- **Slice 4 follow-up — vendor publish button (step 14).** Vendor-frontend button calling `POST /storefront/publish`, surfacing the `StorefrontNotReadyToPublish` reasons. The gate itself is shipped.
- **Styling / design pass.** Header/dish cards/dish sheet match the mockups (done with slice 2). Remaining polish: `NgOptimizedImage` + Cloudinary loader for the cover; sheet slide-up/down animation (deferred — `animate.enter` keys on DOM insertion but the sheet content persists across opens; use `@starting-style` on the dialog's open state instead).
- **Real-time availability** (roadmap). Live dish sold-out/available (WS/SSE + signals) — introduces client state, likely NgRx per project convention.
- **Ordering + payment** (later roadmap). Cart, customer auth, checkout, payment — the transactional turn that kept this on Angular.
- **Prod deploy.** `render.yaml` already defines the SSR node service on `*.marketmiam.fr`; needs real wildcard DNS + the first `subdomain_registry` rows inserted by hand per env.
- **`SubdomainAssigned` command** (v2). When vendors self-select/rename their URL: reservation-on-command writes the table and emits the event together.
