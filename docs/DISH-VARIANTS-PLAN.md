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

**Slice 3 — revise path**
- `ItemRevised` widened to `price` xor `variants`; `ReviseItem` / `reviseItem` / `Item.revise` carry variants (via the `Variants` VO). XOR guard on revise.
- Read model: projection + both stores carry variants through `reviseItem`, replacing price↔variants (postgres `UPDATE` sets price NULL + jsonb; verified via `test:container`). Flat↔variant toggle locked both directions.

**Slice 4 — HTTP wiring**
- `POST /catalogue` and `PUT /catalogue/:itemId` accept an optional `variants` array (+ optional `price`); verified end-to-end (POST/PUT → command → projection → GET).

## Remaining

### 5. Vendor frontend — Signal Form (`add-dish.ts`)
Design grilled 2026-07-25 (mockups in `./tmp`). **Non-destructive** toggle (both sides keep data); customer label "dès {min} €".
- **Done:** "Prix unique / Plusieurs formats" segmented toggle + `mode` signal; Signal Form gains a `variants` array (2 empty seed rows); two-column format cards (FORMAT · PRIX · DÉTAIL) with numbered badge + live name; scoped `.segment` styling.
- **Remaining reds:**
  - submit → variants, **+ port layer**: `NewDish` / `DishRevision` / `CatalogueItemView` + HTTP gateway gain `variants`.
  - per-row name + price validation; **≥2 gate** (🗑 delete disabled at 2 rows).
  - unique-name (inline error).
  - **up/down reorder** (chevrons in the card header, disabled at the ends — no `@angular/cdk`).
  - edit prefill (a variant dish opens in "Plusieurs formats").
  - vendor `catalogue-list` row: "dès {min} €" + "N FORMATS" + inline format breakdown.

### 6. Customer sheet refinement (mockup 2026-07-25)
Polish the shipped variant sheet (`dish-sheet.ts`) to match the target:
- Header: dish name + **"dès {min} €"** (already shipped).
- Optional kicker/category label under the name (e.g. "PLATS MIJOTÉS") — category is deferred; skip until it ships.
- Dish blurb (shipped), then a **"FORMATS"** section label above the list (new).
- Each format row: name (bold) + price (right, bold), description muted on the line below, divider between rows. Close to shipped — restyle to match.

## Deferred (out of scope; clean to add later)

Per-variant photos · per-variant sold-out · incremental variant commands · drag-drop reorder · ordering/selection.

## Known cosmetic

`Item.price()` returns `this._price!` — safe (the XOR guard guarantees a price on the flat path). Removing the `!` means restructuring the `addItem` payload branch; not required.
