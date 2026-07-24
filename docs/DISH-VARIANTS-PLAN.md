# Dish variants — remaining work

Design decisions: ADR 0033. This file tracks what's left; the ADR is the source of truth for *why*.

## Done (domain add-command slice)

- `ItemAddedToCatalogue` payload carries `price` **xor** `variants[]` — additive, tolerant reader, `version` stays 1. Old flat events replay unchanged.
- `AddItemToCatalogue` command + handler + `Catalogue.addItem` — params objects.
- `Variant` value object (`{name, description, price}`, reuses `ItemName`/`ItemDescription`/`ItemPrice`).
- Invariants on the add path, each a `DomainError` → 400: **≥2 variants** (`TooFewVariantsError`), **priced-xor-variants** (`InvalidDishPricingError`), **unique names** (`DuplicateVariantNameError`).

## Remaining (ordered slices)

### 1. Read model
- Migration: `catalogue_view_items.price` → nullable; add `variants jsonb` column.
- `CatalogueViewItem`: `price?`, `variants?`.
- `catalogue-view.projection.ts`: remove the `ponytail:` guard that skips variant dishes; project the variants array.
- Both stores (`in-memory-catalogue.views.ts`, `postgres-catalogue.views.ts`): read/write variants.

### 2. Customer read surface + rendering
- `DishViewModel`: add variants; `priceLabel` = **"dès {min} €"** for variant dishes (min of variant prices).
- `toViewModel`: derive the min; map the variant list.
- `dish-sheet.ts`: render the variant list (`name · price · description`) under the dish blurb.
- `dish-card.ts`: show "dès {min} €".

### 3. Revise path
- `ItemRevised` payload widened like the add event (`price` xor `variants`).
- `ReviseItem` command + handler + `Catalogue.reviseItem`: carry variants, same three invariants, allow flat↔variant toggle.
- `ItemPriceChanged`/`ItemRetired` stay flat-only — variant price edits go through revise (whole-array atomic).

### 4. HTTP wiring
- `POST /catalogue` and `PUT /catalogue/:itemId` DTOs (`catalogue.controller.ts`): accept `variants`.

### 5. Vendor frontend — Signal Form (`add-dish.ts`)
- "This dish has variants" toggle: swaps the price field ↔ a variant editor.
- Variant editor: add/remove rows, **up/down reorder** (swap adjacent indices — no `@angular/cdk`), per-row name + price validation, ≥2 gate, unique-name check.
- Submit gating for the variant shape; edit mode uses the same toggle (flip drops the other side).

## Deferred (out of scope; clean to add later)

Per-variant photos · per-variant sold-out · incremental variant commands · drag-drop reorder · ordering/selection.

## Known cosmetic

`Item.price()` returns `this._price!` — safe (the XOR guard guarantees a price on the flat path). Removing the `!` means restructuring the `addItem` payload branch; not required.
