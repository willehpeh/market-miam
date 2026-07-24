# Catalogue ("Ajoutez vos plats") — Status & Remaining Work

Vendors build a catalogue of dishes, reached from dashboard step 2 (`/dashboard/catalogue`). Design: `docs/design/add-dishes.png` (list) + `docs/design/add-dish.png` (form). Built outside-in TDD, thin vertical slices, backend-first.

## Item shape (locked)

5 fields only: `itemId, name, description, price, imageReference`. Domain in `packages/market-days/src/catalogue/` (aggregate, `item/` VOs) + `catalogue-view/` (read model). Commands `AddItemToCatalogue` / `ReviseItem` / `ChangeItemPhoto` / `RetireItem`; add, list, revise and re-photo are wired to HTTP.

| field | rule |
|-------|------|
| `itemId` | non-empty; **client-supplied** in POST body |
| `name` | non-empty (`EmptyValueError`) |
| `description` | optional, no validation |
| `price` | **integer cents**, `≥ 0` (`InvalidPriceError`) |
| `imageReference` | **non-empty** (`ImageReference`) — a dish cannot be added without a photo |

## Done

**Backend** — `POST /api/catalogue` (add) + `GET /api/catalogue` (list), persisted through the read model in both persistence modes.
- `9cea26b` — `ItemPrice` rejects non-integers (cents); `InvalidPriceError` → `DomainError`.
- `e857b69` — swept 8 more market-days domain errors to `DomainError` (infra/auth left: `ConcurrencyError`, `InvalidTokenError`).
- `6119c27` — `InMemoryCatalogueViews` promoted to the package; `FindVendorCatalogue` query + handler.
- `9a41ef4` — `CatalogueController`; `PostgresCatalogueViews` + migration `0005_catalogue_view_items`; `CatalogueViewProjection` + query handler wired into `market-days.module.ts` (both branches); HTTP acceptance test; shared `catalogueViewsContract` run against in-memory + a real Postgres container.
- `20df9b1` — `POST /api/catalogue/photo/signature {itemId}` → `SignedUpload` for `dishes/{vendorId}/{itemId}`. Mirrors `storefront cover-photo/signature`, reuses `SignedUploads` as-is (already in the module — no wiring). Eager rendition is still the cover-photo one (`ponytail:` in the controller) until the form fixes the dish card size.

**Frontend** — read-only list page (`f5bba2f` + slice files swept into `3e5e451`).
- `apps/vendor-frontend/src/app/catalogue/` — port/facade (abstract+store+fake)/state/http/effects/providers, mirrors the storefront slice.
- `catalogue-list.ts` at `/dashboard/catalogue`: loads on init, renders photo + name + price (`cents → "13,00 €"`). "Ajouter un plat" → `/dashboard/catalogue/new`; "Continuer · N plats" → `/dashboard`.
- `add-dish.ts` at `/dashboard/catalogue/new` (replaced the `ComingSoon` stub). Signal Forms; camera-first photo (`capture="environment"`), name (required), price (text → cents), description (optional). Submit disabled until name+price valid and a photo is uploaded. Mints `itemId` once, reuses it for sign + add. Write path added to the slice: port `photoSignature`/`add`, `UploadDishPhoto`/`AddDish` flows, `navigateOnAdded$` → list. Reuses storefront's `PhotoUploads`/`CloudinaryPhotoUploads` as-is.
- Two test layers: component (fake facade) + slice integration (real facade+effects+http, Cloudinary boundary faked via `FakePhotoUploads`).
- `dashboard.ts` step 2 ("Composez votre catalogue") shows FAIT once the catalogue holds ≥1 dish, with the dish count as its detail ("N plat(s) ajouté(s)"): injects `CatalogueFacade`, `load()`s on arrival (constructor), derives `done` + count from `items()` (store selector). Guard spec (all-fake facades) provides `FakeCatalogueFacade`; the launch spec (all-real) wires the real catalogue slice and flushes `GET /api/catalogue` on the dashboard-landing tests.

## Decisions (don't re-litigate)

- **Price = integer cents.** Frontend parses/formats; event + `catalogue_view_items.price` store cents.
- **`itemId` client-supplied** so the future photo `public_id` (`dishes/{vendorId}/{itemId}`) is known before the add call.
- **Category + tags deferred** — the design wants them, the domain has neither. Add later as an `ItemAddedToCatalogue` v2 (new VOs + payload fields + read-model columns).
- **List page shipped before the add form** — read path needs no photo; write path needs the whole Cloudinary flow.
- **`RetireItem` has no controller.** Its handler + projection branch exist but nothing dispatches it. (`ChangeItemPrice` was in the same state and has been deleted — `ReviseItem` carries the price, so a price-only command had no route left to arrive on.)
- **Read model in both branches** (in-memory + Postgres) so prod (postgres) boots — the query handler + projection instantiate in every mode.
- **API tests are acceptance tests** (`bootApiTestApp` + supertest), not controller unit tests. Postgres store held to the same `catalogueViewsContract` as in-memory, via testcontainers.

## Next / not done

1. **Dish eager rendition** — the display transform on the form is `c_fill,w_600,h_400`, but the API still eagerly warms the cover-photo rendition (`ponytail:` in `catalogue.controller.ts`). Pass a dish eager transform to `SignedUploads.for` so the card rendition is pre-generated. Off the happy path (only affects first-paint warmth), so deferred.
2. **Category + tags** — the v2 domain extension (new VOs + `ItemAddedToCatalogue` v2 payload + read-model columns), then surface on the form (`CATÉGORIE`/`ÉTIQUETTES` in `add-dish.png`) + list cards.
3. **`AddDishFailure` unreduced** — emitted but no add-error banner (mirrors storefront's `EditStorefrontFailure`). Wire a reducer + UX when the flow needs it.

## Gotchas

- **vitest strips types without checking.** Angular's compiler plugin *does* typecheck the frontend build (a bad import fails the `nx test vendor-frontend` run); the `market-days`/`api`/`test` projects need `nx typecheck` — vitest alone won't catch type errors.
- **Container specs run separately:** `nx run test:test:container` (needs Docker), excluded from `nx test test`. New read-model tables must be added to `test/src/event-sourcing/postgres/testcontainer.ts` `reset()` TRUNCATE list.
- **`Catalogue.apply` handles only `ItemAddedToCatalogue` — not a bug today.** `reviseItem`/`changeItemPhoto` mutate the `Item` directly and emit values taken from the command, and no decision reads retired-state (no "already retired" invariant), so applying the other events would change nothing observable. Note this makes `Catalogue` the one aggregate that breaks ADR 0008's "mutation happens only by applying events" — the divergence is latent, not live, because a handler loads a fresh aggregate per command. It becomes real when an invariant consults that state (e.g. block revise/retire of a retired item). When `RetireItem` gets a controller: decide that rule first, then apply `ItemRetired` iff the rule needs it.
- Parallel `git add -A` commits on `main` have twice swept staged catalogue files into unrelated commits — commit frontend work before staging elsewhere.
