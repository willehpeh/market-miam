# Catalogue ("Ajoutez vos plats") — Status & Remaining Work

Vendors build a catalogue of dishes, reached from dashboard step 2 (`/dashboard/catalogue`). Design: `docs/design/add-dishes.png` (list) + `docs/design/add-dish.png` (form). Built outside-in TDD, thin vertical slices, backend-first.

## Item shape (locked)

5 fields only: `itemId, name, description, price, imageReference`. Domain in `packages/market-days/src/catalogue/` (aggregate, `item/` VOs) + `catalogue-view/` (read model). Commands `AddItemToCatalogue` / `ChangeItemPrice` / `RetireItem` already existed; only add + list are wired to HTTP.

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
- `catalogue-list.ts` at `/dashboard/catalogue`: loads on init, renders photo + name + price (`cents → "13,00 €"`). "Ajouter un plat" → `/dashboard/catalogue/new` (`ComingSoon` stub); "Continuer · N plats" → `/dashboard`.
- Two test layers: component (fake facade) + slice integration (real facade+effects+http, HTTP boundary faked).

## Decisions (don't re-litigate)

- **Price = integer cents.** Frontend parses/formats; event + `catalogue_view_items.price` store cents.
- **`itemId` client-supplied** so the future photo `public_id` (`dishes/{vendorId}/{itemId}`) is known before the add call.
- **Category + tags deferred** — the design wants them, the domain has neither. Add later as an `ItemAddedToCatalogue` v2 (new VOs + payload fields + read-model columns).
- **List page shipped before the add form** — read path needs no photo; write path needs the whole Cloudinary flow.
- **Add + list only over HTTP.** `ChangeItemPrice`/`RetireItem` handlers + projection exist but have no controller.
- **Read model in both branches** (in-memory + Postgres) so prod (postgres) boots — the query handler + projection instantiate in every mode.
- **API tests are acceptance tests** (`bootApiTestApp` + supertest), not controller unit tests. Postgres store held to the same `catalogueViewsContract` as in-memory, via testcontainers.

## Next / not done

1. **Add-dish form** (`/dashboard/catalogue/new`, currently a stub). Signature endpoint is shipped (see Done); this is the remaining frontend slice. Signal Forms, mirror `storefront-form.ts`. Design: `docs/design/add-dish.png`.
   - Fields this slice: photo, name, price (`… EUR`, formatted, stored as cents), description (optional). Category/tags still out (item 2).
   - Photo is **camera-first** in the design ("photo prise à l'instant" / "Reprendre"). Native path: `<input type="file" accept="image/*" capture="environment">` — camera on mobile, picker on desktop. Not camera-*only*; forcing that isn't worth it.
   - Submit ("Ajouter à ma carte") flow: mint `itemId` (UUID) → sign → Cloudinary upload (reuse `SignedUpload` **as-is**) → `POST /api/catalogue` with `imageReference = v{version}/dishes/{vendorId}/{itemId}`. "Annuler"/back → `/dashboard/catalogue`.
   - Dish eager rendition: pick the card size here and pass a dish eager transform to `SignedUploads.for` (currently hardcoded to the cover-photo rendition — see the `ponytail:` in `catalogue.controller.ts`).
2. **Category + tags** — the v2 domain extension above, then surface on form + list cards.
3. **Dashboard step 2 → FAIT** when the catalogue has ≥1 dish (dashboard reads the catalogue facade; needs a catalogue load on the dashboard). Currently hardcoded `done: false`.

## Gotchas

- **vitest strips types without checking.** Angular's compiler plugin *does* typecheck the frontend build (a bad import fails the `nx test vendor-frontend` run); the `market-days`/`api`/`test` projects need `nx typecheck` — vitest alone won't catch type errors.
- **Container specs run separately:** `nx run test:test:container` (needs Docker), excluded from `nx test test`. New read-model tables must be added to `test/src/event-sourcing/postgres/testcontainer.ts` `reset()` TRUNCATE list.
- **`Catalogue.apply` handles only `ItemAddedToCatalogue` — not a bug today.** No decision reads price (`changeItemPrice` overwrites unconditionally, emits the new price) or retired-state (no "already retired" invariant), so applying the other two events would change nothing. It becomes relevant only when you add an invariant that consults that state (e.g. block reprice/retire of a retired item). When `RetireItem`/`ChangeItemPrice` get controllers: decide that rule first, then apply `ItemRetired` iff the rule needs it. Price almost certainly never needs applying.
- Parallel `git add -A` commits on `main` have twice swept staged catalogue files into unrelated commits — commit frontend work before staging elsewhere.
