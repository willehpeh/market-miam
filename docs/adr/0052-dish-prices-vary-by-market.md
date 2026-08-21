# 0052. Dish prices vary by market, not by day

Date: 2026-08-21 · Status: Accepted

## Context

A vendor does not charge the same price for the same dish at every market. The
catalogue price is the only price the product has.

Both read paths join the catalogue live at query time
(`find-upcoming-market-days.handler.ts:105`, `find-market-day.handler.ts:50`);
the comment on the first records that as deliberate — a revised name or price
reaches days already planned.

The fact the client is describing belongs to the market, not to the day. Markets
recur; entering the price per occurrence means re-entering the same number every
week, and one omission is a wrong price on a public storefront.

## Decision

**Overrides hang off the market, on `Calendar`, keyed by `marketId`** — not
`scheduleId`, because two schedules can sit at one market.

**One event, set whole (ADR 0047):**

```ts
MarketPricesSet { marketId, prices: Record<string, number | Record<string, number>> }
```

`itemId` → cents for a flat dish, `variantName` → cents for a variant dish. A
union at the value position rather than the catalogue's `{ price?, variants? }`
XOR (ADR 0033): the value *is* the pricing, nothing sits beside it, so
`typeof === 'number'` discriminates and `Pricing`'s both-or-neither error is
structurally impossible. Variant entries carry no description — the catalogue
stays the only source for that.

**Sparse at both levels.** An absent `itemId` means the catalogue price; an
absent variant name means the catalogue price. Set-whole is the command's
contract — the market's whole map is replaced, an empty map clears it — but
within an item sparseness *is* the fallback rule. Adding a variant to a dish
does not invalidate existing overrides.

**Writes strict, reads lenient** — the asymmetry of ADR 0039.

| | Rule | Mechanism |
|---|---|---|
| Write | Reject a mismatched override | `Catalogue.confirmPricing` tells each `Item` to accept its override (ADR 0008 — `Item` has no getters); `Pricing` throws `MismatchedPricingError` (→ 400, ADR 0045) for flat-on-variant, variant-on-flat, or an unknown variant name. `itemWithId` already throws `NoSuchItemError` |
| Read | Ignore a mismatched override | `pricedAt` matches by view shape: `variants` present → apply the name map, `price` present → apply the number, mismatch → use the catalogue |

A vendor flipping a dish from variants to flat silently drops that market's
overrides for it rather than breaking the storefront.

**`MarketPrices` validates on construction** (ADR 0007): each price through the
existing `ItemPrice` (integer cents ≥ 0), each variant key through `ItemName`,
empty variant maps rejected. `Record` gives key uniqueness free.

**One join point.** `pricedAt(marketId, items)` is called from both query
handlers; every read surface inherits the precedence rule from there.

**The carte shows no price anywhere** — neither the cards nor the sheet they
open. `/carte` is market-independent, so with prices varying by market it has
no price to state; hiding it on the card alone would leave the removal one tap
deep.

**`Menu`, `MarketDayMenuSet` and `MarketDay` are untouched.** Prices are not
snapshotted into the menu event.

## Consequences

### Domain — `packages/market-days/src/`

* `calendar/events/market-prices-set.ts`, added to `CalendarEvent`
* `calendar/pricing/market-prices.ts` and `calendar/errors/mismatched-pricing.error.ts`
* `Calendar`: `_prices`, an `apply` case, `setMarketPrices(marketId, prices)` refusing a market it does not schedule
* `Catalogue.confirmPricing` → `Item.confirmPricedBy` → `Pricing.confirmMatchedBy`
* `set-market-prices/` command + handler, loading `Catalogues` alongside `Calendars` — the *handler passes* shape of ADR 0051, as `SetMarketDayMenuHandler` already does
* Controller route and zod request shape (ADR 0046)

### Read model

* `market-prices-view/` — projection, store, in-memory and postgres twins, keyed `(vendorId, marketId)`, `prices jsonb`; new migration
* `pricedAt` helper, joined via the existing `Promise.all` in `find-upcoming-market-days.handler.ts:105` and `find-market-day.handler.ts:50`

### Frontend

* **vendor** — per-market price editor: a row per flat dish, a row per variant, catalogue price as placeholder, blank meaning unchanged. This is most of the slice
* **vendor** — the menu-editor picker reads the catalogue store directly (`docs/MENU-DU-JOUR-PLAN.md:204`), so it would show list prices while planning a market. Route it through that market's prices
* **customer** — hide prices on `/carte`: `priceLabel` on the card, and both the item price line and the per-variant prices in the sheet, whose *Formats* list becomes name and description only. `ItemCard` (`markets/market-card.ts:55`) and `ItemSheet` (`storefront-page.ts:81`) are each shared with the home page, where the prices stay — one input per component, set by the carte. Do not strip either component
* **customer** — nothing else. The handlers return already-priced `CatalogueViewItem`s, so `priceLabelFor` (`storefront-view-model.ts:104`) derives *dès {min} €* per market for free, including when the cheapest variant differs between markets

### Deferred

* **Per-day override** — `MarketDayPricesSet` on the market-day stream; `pricedAt` becomes day → market → catalogue. A separate event, never folded into `MarketDayMenuSet`: `Menu.equals` compares id sets to suppress no-op writes, so a price-only change would compare equal and the event would be dropped silently.
* **Ordering** — the price a customer pays is captured on the order event at order time, not read back from anywhere. Snapshotting prices into the menu event would give stale truth rather than historical truth, and would forfeit the live join that lets a corrected price reach days already planned.
* **Orphan overrides need no cleanup.** The read join is menu ∩ catalogue and occurrences come from schedules, so entries for a retired item or a cancelled schedule are unreachable. Related: *retiring an item doesn't check if it's been planned* (`NEXT_BEHAVIOURS.md`).

### Rejected

| Option | Why not |
|---|---|
| Per-day overrides only | The vendor re-enters a stable fact at every occurrence; one omission is a wrong public price |
| Prices on the catalogue item, keyed by market | Retire and revise would drop overrides naturally, but what a dish costs at a market is calendar knowledge, and `MarketDays` already reads `Calendar` on every command (ADR 0051) |
| Riding in `MarketScheduleAmended` | Amending hours would have to restate every price |
| A percentage adjustment per market | Cash prices are round — a 10 € dish becomes 12 €, not 11 € |

Builds on ADRs 0007, 0008, 0009, 0033, 0039, 0045, 0046, 0047, 0051.
