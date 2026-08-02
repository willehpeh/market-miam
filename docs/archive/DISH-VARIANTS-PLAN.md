# Dish variants — remaining work

> **Archived 2026-08-02** — feature complete; nothing remaining. Design rationale lives in ADR 0033. The out-of-scope follow-ups listed under "Deferred" below stay valid as future ideas.

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

**Slice 5 — vendor frontend (form + list)**
- `add-dish.ts`: "Prix unique / Plusieurs formats" toggle (`mode`); formats editor with add/remove rows (2-row min, 🗑 disabled at 2), up/down reorder (disabled at ends), two-column FORMAT/PRIX/DÉTAIL cards, numbered badge + live name; scoped `.segment` / `.icon-btn` / `.add-format` styling.
- Submit branches on mode → formats sent as `{name, description, variants}`; `cannotSubmit` gates on complete + unique format rows. Edit opens a variant dish in formats mode, prefilled.
- Port layer: `NewDish` / `DishRevision` / `CatalogueItemView` + HTTP gateway + NgRx effects/reducer thread variants.
- `catalogue-list.ts`: a variant row shows "dès {min} €" + N formats + inline breakdown.
- *Not done (optional polish):* inline per-row error text — submit is gated + server 400 backstops, but rows show no red-text errors yet.

**Slice 6 — customer sheet refinement (mockup 2026-07-25)**
- `dish-sheet.ts`: **"Formats"** `.field-label` section label (divider above it) separating blurb from the list; row name → `font-bold`.
- Category kicker deferred with the category feature. Rest of the sheet (header "dès {min} €", per-row name/price/muted description, dividers) was already shipped in Slice 2.

## Remaining

*(none — feature complete; see Deferred for out-of-scope follow-ups)*

## Deferred (out of scope; clean to add later)

Per-variant photos · per-variant sold-out · incremental variant commands · drag-drop reorder · ordering/selection.

## Known cosmetic

`Item.price()` returns `this._price!` — safe (the XOR guard guarantees a price on the flat path). Removing the `!` means restructuring the `addItem` payload branch; not required.
