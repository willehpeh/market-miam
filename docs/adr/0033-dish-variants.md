# 0033. Dish variants: a dish is flat or variant, never both

Date: 2026-07-24 · Status: Accepted

## Context

Catalogue `Item`s are flat: `name`, optional `description`, one required
`price` (integer cents), optional photo. Vendors need dishes sold *only* as a
set of options — no main style, just variants — each with its own name,
description, and price (e.g. a pizza offered as Margherita / Pepperoni, priced
separately). Storefront is display-only today (dish-card → dish-sheet, no cart).

## Decision

- **A dish is exactly one of two kinds**, hard XOR, aggregate-enforced:
  | Kind | Price | Variants |
  |---|---|---|
  | Flat (today's shape) | one required `ItemPrice` | none |
  | Variant | none | **≥2** |

- **Variant = `{ name, description?, price }`.** `VariantName` mirrors
  `ItemName` (trim, non-empty); reuse `ItemDescription` (optional, unvalidated)
  and `ItemPrice` (integer cents ≥0 — a €0 variant is legal). No per-variant
  photo; the dish's single photo is shared.

- **Atomic lifecycle.** Variants are defined at dish creation and edited as a
  whole — no incremental `AddVariant`/`RemoveVariant` commands. The variant set
  rides in the item's existing add/revise payload.

- **Event evolution is additive, `version` stays 1.**
  `ItemAddedToCatalogue` and `ItemRevised` gain a *second legal payload shape*
  (`variants[]`, no `price`) alongside the flat shape (`price`, no `variants`).
  Old stored events already match the flat shape → replay unchanged, no
  upcaster, no migration. **Tolerant reader**; discriminate on presence:
  `price` → flat, `variants` → variant. Not a `version: 2` — versioning is for
  *breaking* payload changes, this is not one.

- **Toggle on edit.** The "this dish has variants" switch is available on
  create *and* edit, via `ReviseItem`. Flip on → drop the scalar price, require
  ≥2 variants; flip off → drop variants, require a price. Spares a destructive
  delete-and-recreate that would lose the `itemId` and photo.

- **Invariants + new `DomainError`s** (→ 400 via the global filter):
  - XOR: reject a dish with both price and variants, or with neither.
  - `< 2` variants on a variant dish.
  - Duplicate variant names within one dish (name is the selectable identity;
    the future ordering slice references it). Uniqueness is per-dish only.

- **Display-only storefront.** Card + vendor list show **"dès {min} €"** (the
  cheapest variant's price). Sheet shows the optional dish blurb, then the
  variant list — each `name · price · description`. No selection, no cart, no
  "chosen variant" state.

- **Reorder is a form affordance, not a domain concept.** Array order *is*
  display order — preserved through payload, projection, and render, no sorting.
  The vendor arranges rows in the form via **up/down controls** (swap adjacent
  indices). No drag-drop, no `@angular/cdk` dependency.

## Consequences

- **`Item` price becomes optional.** The constructor and `Item` today require
  `ItemPrice`; a variant dish has none. New `Variant` entity/VO and `VariantName`
  VO under `catalogue/item/`.

- **Read model stores the variant array; min price is derived at read.** Add a
  `variants jsonb` column to `catalogue_view_items` and make `price` nullable
  (new migration). No denormalised min-price column to keep in sync. `jsonb`
  (not a child table) because variants are only ever read whole, per dish, never
  queried across dishes — revisit only if that changes.

- **Projection** (`catalogue-view.projection`) and both stores
  (`in-memory-catalogue.views`, `postgres-catalogue.views`) branch on payload
  shape. `ItemPriceChanged` stays flat-only — variant price edits go through
  `ReviseItem` (whole-array atomic).

- **Frontend** (`add-dish.ts`, Signal Forms): toggle + variant editor
  (add/remove rows, up/down reorder, per-row name/price validation, ≥2 gate).
  Customer `DishViewModel` gains variants + the "from" price label; sheet/card
  render accordingly.

- **Deferred** (clean additive later): per-variant photos, per-variant
  sold-out, incremental variant editing, drag-drop reorder, ordering/selection.

- Builds on ADR 0007 (VO constructor validation), 0008 (no getters — the flat/
  variant self-queries), 0009 (one event per command / vendor-scoped streams),
  0020 (catalogue naming), 0029 (postgres adapters), and the domain-error → 400
  filter.
