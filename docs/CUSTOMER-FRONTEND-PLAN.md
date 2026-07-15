# Customer Frontend — Public Storefront (vitrine)

Per-vendor public storefront at `{subdomain}.votreplateforme.fr`, rendering one vendor's storefront, catalogue, and upcoming markets. App: `apps/customer-frontend` (Angular SSR, currently a bare scaffold). Design: `docs/design/customer-frontend-1.png`, `-2.png`, `-show-dish.png`. Outside-in social TDD, thin vertical slices, backend-first ([[feedback_testing_approach]], [[feedback_incremental_steps_review_gates]]).

## Architecture (resolved)

**No new persisted read model or projection.** The page composes existing/planned persisted read models at read time behind one public endpoint. The only new server state is a subdomain→vendor lookup table.

| Screen region | Source | Status |
|---|---|---|
| Header/footer — name, tagline, phone, cover | `VendorStorefrontViews.findByVendor` | built, reused |
| NOTRE CARTE — dishes | `CatalogueViews.forVendor` | built, reused (retired items already vanish from the view) |
| PROCHAIN / PROCHAINS MARCHÉS | `FindUpcomingMarketDays(vendorId)` | **not built** — `docs/MARKET-SCHEDULE-PLAN.md` §"Upcoming market days" |
| subdomain → vendorId | `subdomain_registry` table | new (this plan) |

Composition: `GET /public/storefront/:subdomain` (public, no auth) resolves the subdomain, fans out to the three read models, returns one `CustomerStorefront` DTO. SSR fetches a single URL. Read-time compute is confined to the start-time cutoff; everything else is a view read.

## Subdomain resolution

- `subdomain_registry(subdomain TEXT PRIMARY KEY, vendor_id TEXT NOT NULL UNIQUE)` — `subdomain` PK is both the reservation guard and the resolution lookup; stored lowercase, normalized (`.toLowerCase()`) at the api boundary (DNS is case-insensitive). `vendor_id UNIQUE` = one subdomain per vendor, so `removeFor` is deterministic.
- **Authoritative write-model table, not a projection** — not rebuilt from events. A projection would reintroduce the uniqueness race the unique index exists to prevent.
- **No event, no command in v1. Rows manually seeded.** A `SubdomainAssigned` event + reservation-on-command arrive only when a vendor chooses/renames their URL — that command's handler writes the table and emits the event together. Until then the table is the sole authority; only the writer evolves (operator → command → vendor), never the table.
- Resolution: `SELECT vendor_id WHERE subdomain = $1`; miss → 404.
- Erasure ([[project_vendor_erasure_scope]], ADR 0025): `SubdomainRegistry.removeFor(vendorId)` is wired into `VendorErasure.erase()` (**new work, slice 1** — the registry is a new table erasure didn't previously know) → row deleted → storefront 404s. No SHREDDED-sentinel guard in the customer handler; row deletion is the sole defence. Without it the rebuilt storefront view renders the `<shredded>` sentinel (`name/phone = '<shredded>'`) on a public page.

## DTO

```
CustomerStorefront {
  name, description, phone,
  coverPhoto?,                                   // raw Cloudinary public-id — frontend builds the URL (see Image refs gotcha)
  dishes: [{ id, name, description, price, photo? }],
  upcomingMarkets: [{ date, weekday, marketName, startTime?, endTime?,
                      street?, postalCode, town, pitch? }]
}
```

- `nextMarket` (PROCHAIN MARCHÉ) = `upcomingMarkets[0]` — no separate field.
- `upcomingMarkets` = `FindUpcomingMarketDays` occurrences, minus in-progress (start-time cutoff below), first ~5.
- Image fields (`coverPhoto`, dish `photo`) are raw Cloudinary public-ids, not URLs — the frontend builds delivery URLs (no server-side builder exists).

## Decisions (don't re-litigate)

- **Reuse over refold.** The customer view composes the three persisted read models; no read-time event-store fold, no bespoke customer projection. The three sources have no cross-join in v1 (menu chips cut), so their independent lag composes one page without inconsistency (ADR 0002).
- **Markets read the shared model, not a customer BFF expansion.** Expansion + retraction (cancel/skip) live once in `FindUpcomingMarketDays`. A BFF expansion off the Calendrier view was **rejected**: it duplicates the `Schedule` VO cadence math and — without cancel/skip — asserts false future attendance on a customer surface (a shopper sent to an empty pitch). Buys no performance either: `FindUpcomingMarketDays` also expands at query time.
- **Start-time cutoff is customer-side presentation.** Drop occurrences whose start (`date` + `startTime`, hardcoded `Europe/Paris`) has passed. The in-progress window belongs to a future active-market-day interface (MarketDay "in progress" lifecycle); vendor reads of the same model keep in-progress days, so this filter stays in the customer layer, not the read model. `Europe/Paris` is a single-region calibration constant → becomes a `Market` timezone attribute when multi-region.
- **Menu chips per market: cut.** Cards show date/market/hours/address only — no "Menu à venir" placeholder (nothing behind it). The dish↔market-day join is the separate prepared-state overlay slice (`docs/MARKET-SCHEDULE-PLAN.md`).
- **Categories + tags: cut.** Domain has neither; deferred as `ItemAddedToCatalogue` v2 (`docs/CATALOGUE-PLAN.md`). Dish card + modal show name/description/price/photo only.
- **Dish detail modal: no endpoint.** Opens client-side from `dishes[]`; "Disponible les jours de marché…" is static copy, not a data field.
- **404 on unresolved subdomain.** Empty catalogue/schedule → empty arrays; missing cover → null (frontend renders the "photo du stand" placeholder).
- **Composite query, thin controller.** One `FindCustomerStorefront(subdomain)` handler injects the `SubdomainRegistry` port + the view ports, resolves then composes the DTO, returns `undefined` on miss; `PublicStorefrontController` is one `execute()` + `null→404`. Subdomain resolution is a plain port method (`vendorFor`), **not** its own CQRS query. Fan-out + the start-time cutoff live in the handler, not the controller.

## Dependency

Slice 3 (markets) is **blocked on** `docs/MARKET-SCHEDULE-PLAN.md` §"Upcoming market days": write half (`CancelMarketSchedule` / `SkipMarketDay`) + read half (`FindUpcomingMarketDays`). Slices 1–2 (storefront, catalogue) have no such dependency and ship first.

## Build order — vertical tracer-bullet slices, outside-in TDD, review gate each

**Slice 1 — resolve + storefront (the tracer bullet).**
1. `subdomain_registry` migration (DDL only — empty table, PK + `UNIQUE(vendor_id)`; **no seed**, rows hand-inserted per env) + `SubdomainRegistry` port (`vendorFor`/`removeFor`) with Postgres/InMemory adapters.
2. `GET /public/storefront/:subdomain` acceptance (RED): 404 on miss → storefront-view fields on hit. Public, exempt from the vendor auth guard.
3. SSR: Angular resolver injects `REQUEST` → `Host` → subdomain (first-label split; `?subdomain=` fallback on localhost) → fetch → render header/footer. Response → TransferState via `provideClientHydration`; add `customer-frontend` env for `apiBaseUrl`.
4. Erasure: extend `vendor-erasure.spec` — erased vendor's subdomain no longer resolves; add the `removeFor` call to `VendorErasure`.

Proves the whole pipe DNS→SSR→api→resolve→view→render, thinnest path.

**Slice 2 — catalogue.**
4. Extend endpoint/DTO with `CatalogueViews.forVendor` dishes.
5. Frontend NOTRE CARTE list + dish detail sheet (opened client-side from list data).

**Slice 3 — markets (blocked; see Dependency).**
6. Extend endpoint/DTO with `FindUpcomingMarketDays`; apply the start-time cutoff; `nextMarket = [0]`.
7. Frontend PROCHAIN MARCHÉ card + PROCHAINS MARCHÉS list (date badge, hours, address).

## Gotchas / open

- **Public route must bypass the vendor auth guard.** Verify the guard's scoping and confirm `/public/storefront/:subdomain` doesn't collide with existing controller routes when building slice 1.
- **Dev subdomains.** Wildcard DNS (`*.votreplateforme.fr`) is provisioned for prod; on `localhost` (Host carries no subdomain) the resolver falls back to a `?subdomain=` query param. `DEV_SUBDOMAIN` env deferred — avoids `process.env` plumbing in SSR/browser-shared code; add only if the query param gets tedious. The api never reads `Host` — it always receives a real `:subdomain` param.
- **PII on a public surface by design.** storefront-view name/description/phone are shown (phone in the footer). Shredded vendor handled by erasure deleting the subdomain row, not a view guard.
- **Image URLs.** No server-side URL builder exists (only `vendor-frontend`'s `cloudinary-url.pipe`). The DTO returns raw Cloudinary public-ids (`imageReference`); the customer-frontend builds delivery URLs client-side, mirroring that pipe ([[project_cover_photo_upload]]). Keeps multiple transforms per image (card thumb vs modal) available for slice 2; `cloudName` is public.
- **Open — read-model overlap.** `FindUpcomingMarketDays` and the Calendrier view store near-identical rows (schedule snapshot keyed `(vendorId, scheduleId)`); a one-model/two-queries consolidation is possible but touches shipped Calendrier code — deferred to `docs/MARKET-SCHEDULE-PLAN.md`.
