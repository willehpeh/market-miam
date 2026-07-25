# Dish variants — remaining work

Design decisions: ADR 0033. This file tracks what's left; the ADR is the source of truth for *why*.

## Done

**Add-command domain slice**
- `ItemAddedToCatalogue` payload carries `price` **xor** `variants[]` — additive, tolerant reader, `version` stays 1. Old flat events replay unchanged.
- `AddItemToCatalogue` command + handler + `Catalogue.addItem` — params objects.
- `Variant` VO + `Variants` collection VO (validates **≥2** and **unique names** in its constructor; re-validates on rehydration).
- Invariants, each a `DomainError` → 400: `TooFewVariantsError`, `InvalidDishPricingError` (priced-xor-variants), `DuplicateVariantNameError`.

**Slice 1 — read model**
- `CatalogueViewItem`: `price?` + `variants?`. Projection projects variant dishes (skip-guard removed).
- Migration `0009`: `price` nullable + `variants jsonb`. In-memory + postgres round-trip variants (postgres verified via `test:container`).

**Slice 2 — customer read surface + rendering**
- `toViewModel`: variant dish → `priceLabel` **"dès {min} €"** + variant list `{name, description, priceLabel}`.
- `dish-sheet.ts` lists the variants under the blurb; `dish-card.ts` shows "dès {min} €" via `priceLabel`.
- Backend serves variants unchanged — `FindCustomerStorefrontHandler` passes `catalogue.items` whole; DTO reuses `CatalogueViewItem`. *(Pass-through untested — a `dishes[0].variants` assertion in the handler spec would lock it.)*

## Remaining (ordered slices — numbers kept for continuity)

### 3. Revise path
- `ItemRevised` payload widened like the add event (`price` xor `variants`).
- `ReviseItem` command + handler + `Catalogue.reviseItem`: carry variants, same three invariants, allow flat↔variant toggle.
- `ItemRetired` stays flat-only — variant price edits go through revise (whole-array atomic).

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
