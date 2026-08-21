# Prix par marché — plan

A vendor does not charge the same price for the same dish at every market. Shipped end to
end: the price list is set whole per market, validated against the catalogue, projected,
joined onto every day a customer sees, edited on its own screen and quoted by the menu
picker. The customer carte quotes nothing — a price appears only on a market that is
trading, and it is that market's.

Reasoning lives in [ADR 0052](adr/0052-dish-prices-vary-by-market.md); this file is the
slicing and the running record.

## Decisions

Domain decisions are the ADR's. These are the frontend ones, settled by grilling after the
backend shipped. Do not re-litigate without a reason.

| # | Decision | Rationale |
|---|---|---|
| 1 | Screen at `/dashboard/market-prices/:marketId`, entered from a **Tarifs** link in the market card | URL keys the way the data keys. Two schedules at one market give two cards pointing at one list — correct, since it is one market |
| 2 | The market card becomes a **container**, not one big anchor | An anchor cannot nest, and the card now has two destinations. The markets list is **not** deduplicated to markets: its subject is still *where and when your customers find you* |
| 3 | `GET /market-prices` returns the vendor's **whole set** | It is what `MarketPricesViews.forVendor` already answers; a point lookup would add a narrower read-model method for one screen. The editor needs every market anyway, to know which rows set the carte price (decision 9) |
| 4 | A **form with one save**, patched on success | `SetMarketDayMenu`'s pattern. The live screen's optimism is justified by market wifi and by a screen flip standing in for a receipt; neither applies at a table, and a whole-list rollback would need the previous list carried on failure, which nothing else here holds |
| 5 | **Every catalogue dish**, catalogue order — a row per flat dish, a row per variant, blank meaning the catalogue price | No picker: it adds an interaction to save scrolling, and a picker is what makes *selected but priced nothing* reachable. Collapsing variant dishes is a later refinement that would not change the payload |
| 6 | Catalogue price is **static text beside a labelled input**, never a placeholder | A placeholder vanishes on focus, so the vendor loses the number they are comparing against exactly when they type it. ~~Placeholder~~ — the ADR said placeholder before this was grilled |
| 7 | **Two row states, each with a non-colour cue** — overridden (`bg-brand-soft` + *Tarif marché*), dirty (`border-brand` edge + a count on the save button) | WCAG 1.4.1. The count is what gives a **cleared** row something to show, and how a vendor forty rows down knows there is unsaved work |
| 8 | Menu-editor picker quotes the **market** price, same *Tarif marché* cue. **No price editing on a day screen** — a *Tarifs de ce marché →* link instead | The picker currently quotes a number the customer will not be charged. Editing from a day implies the price belongs to that day; it belongs to the market, and the edit would silently move every other day at it |
| 9 | The carte shows **no price at all**. A price appears only on a market card while that market is **trading**, and it is that market's price. ~~The maximum over the catalogue price and every scheduled market~~ | A carte is tied to no market, so there is no one price it could honestly name. A maximum can only surprise downward, but it still advertises a number nobody is charged, and it left the display question open; showing none closes it. A trading market is the one place a price is unambiguous — the customer is at that stall, and that stall's list is what they will pay |
| 10 | ~~The coupling is surfaced~~ — moot once the carte quotes nothing | Nothing couples a market's price to a public figure any more, so there is no side effect left to warn a vendor about |
| 11 | Pricing gets its **own facade and state slice** | Two unrelated screens read it. Every other area here has the full set (`facade` / `state` / `effects` / `providers` / `fake` / `store`) |

Small rules that follow, already implemented where the backend covers them:

- Empty list is legal and clears the market; unchanged prices raise no event
- A dish naming none of its variants is dropped, so a picker could never store *selected but priced nothing*
- Writes refuse a mismatched shape; reads ignore one, falling back to the catalogue price

## Slice 1 — domain (done)

`SetMarketPrices` → `MarketPricesSet` on `Calendar`, keyed by `marketId`. `MarketPrices`
validates and normalises; `Catalogue.confirmPricing` → `Item.confirmPricedBy` →
`Pricing.confirmMatchedBy` refuses a mismatched shape. `Pricing` split into flat and variant
implementations to answer it. 20 tests in `test/src/market-days/set-market-prices/`.

Commits `81a36c8`, `675ee6d`.

## Slice 2 — HTTP write (done)

`PUT /market-prices/:marketId`, zod-gated at the edge, its own resource rather than hanging
off `/market-schedules`. 10 tests in `apps/api/.../market-prices.spec.ts`.

## Slice 3 — read model (done)

`market-prices-view/` with both twins, `market_prices_views` keyed `(vendor_id, market_id)`,
`prices jsonb` (migration `0017`). Contract shared by in-memory and Postgres; rebuild proved
by `market-prices-rebuild.spec.ts`.

## Slice 4 — day query join (done)

`priced(items, prices)` in `market-prices-view/priced-items.ts`, called from both query
handlers. Takes one market's list, not a market id, so the lookup stays with the handlers.

Commits `7100fa8` (rename `ItemPrice` → `Price`), `d182d77`.

## Slice 5 — read path (done)

`FindMarketPrices` over `MarketPricesViews.forVendor`, `GET /market-prices`. Wrapped as
`VendorMarketPricesView = { markets }` rather than a bare JSON array, since every other read
here returns a named list. 4 tests in `market-prices.spec.ts`; vendor scoping stays the read
model contract's, not the route's.

## Slice 6 — vendor price editor (done)

Route, market card restructured into a container, Signal Forms over every catalogue dish
with `applyEach`, both row states, count on the save button. Own facade and state slice.
22 tests in `price-editor.spec.ts`, 9 in `market-prices.spec.ts`.

Two things the decisions did not cover, settled while building:

- **Row layout**: dish name on its own line, the field and the carte price side by side
  beneath it, so the two numbers are adjacent to compare. Variants nest under the dish name.
- **The screen gates on all three feeds** — schedules, catalogue, prices. Schedules landing
  late would say a market stood at weekly is no longer programmed; prices landing late would
  seed every row at its carte price, and a vendor typing into that saves over a list they
  never saw.

A blank field is legal, so only a *filled* field that will not parse is an error — it says
so on the row without waiting for a blur, and the save button is disabled while one stands.
Dropping it silently would send the dish back to its carte price, which is the one outcome
a vendor who typed a number cannot see coming.

## Slice 7 — menu editor (done)

Picker quotes the market price with the same *Tarif marché* cue, *Tarifs de ce marché →*
under the market name, prices join the screen's loading gate. 8 tests in
`menu-editor.spec.ts` — the picker's price label had none before this.

For a dish sold by variant, **the cue describes the figure beside it and nothing else**: a
market price on a dearer variant leaves the row uncued, because the *dès* shown is still the
carte's. The alternative — cueing whenever the market prices any variant — puts the marker
next to a number it does not describe.

`live-screen.ts` quotes no prices, so the picker was the only place quoting one a customer
would not be charged.

## Slice 8 — the carte quotes nothing (done)

Frontend only, in `storefront-view-model.ts`: `priceLabel` is now optional and set only
where a market is charging — never for `items`, and for a day's menu only when
`inProgress`. The three components that drew it guard the element rather than render an
empty one. `CustomerStorefront` still carries every price; nothing was removed from the
API, so the day a price belongs on the carte again it is already there.

This replaces the maximum, and dissolves the French display question with it: a trading
market quotes exactly what its own list charges, so there is no displayed figure anyone
could be charged above.

## ~~Slice 9 — the coupling, said out loud~~

Dropped with decision 10. There is no public figure for a market's price to govern.

## Open

- **Collapsing variant dishes** in the editor, if catalogues get long enough to hurt. Does
  not change the payload.
- **Per-day override**, deferred in the ADR: `MarketDayPricesSet` on the market-day stream,
  never folded into `MarketDayMenuSet`.

## Known issues (not blockers)

- `nx test api` is flaky on macOS; the failures move between runs. See `CLAUDE.md`.
- `MARKET_MIAM.md` does not list `MarketPricesSet`, and four other shipped events still sit
  under *Events still to come*. Pre-existing drift plus this slice's; unowned.

## Commands

```sh
npx nx test test                  # the social suite — the reliable local signal
npx nx test api                   # re-run before believing a failure
npx nx run-many -t typecheck,lint -p api test market-days
```
