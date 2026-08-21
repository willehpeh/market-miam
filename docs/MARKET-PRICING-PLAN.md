# Prix par marché — plan

A vendor does not charge the same price for the same dish at every market. Backend shipped:
the price list is set whole per market, validated against the catalogue, projected, and joined
onto every day a customer sees. What is **not** built is all of the frontend, and the carte's
maximum.

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
| 9 | The carte shows the **maximum** over the catalogue price and every currently-scheduled market | Being charged more than you were shown is the one surprise that costs trust; a maximum can only surprise downward. Vendors would rather not advertise variance, and this does not state it. Only scheduled markets count, or a cancelled schedule sets the public carte forever with no screen able to reach it |
| 10 | The coupling is **surfaced**, not hidden — price editor marks rows that set the carte, item edit form shows the carte figure when it differs | One market's price governing the whole public carte is a side effect no vendor would predict. The catalogue list stays a scan view |
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

## Slice 6 — vendor price editor (next)

Route, market card restructure (decision 2), form over every catalogue dish, two row states,
save button count. Signal Forms with `applyEach`, as `add-item.ts:410` already does for
variant rows; `catalogue/money.ts` for cents. Own facade and state slice (decision 11).

**This is most of the remaining work.**

## Slice 7 — menu editor

Picker quotes the market price with its cue; *Tarifs de ce marché →* link on the day screen.
The prices slice loads here too.

## Slice 8 — carte maximum

`FindCustomerStorefront` joins prices and schedules to price `items` at the maximum over the
catalogue price and every currently-scheduled market — for a variant dish, the maximum of
each market's *dès* figure, not per variant. No customer-frontend component changes:
`CustomerStorefront.items` feeds the carte alone, and both cards and sheet already render
whatever the query hands them.

## Slice 9 — the coupling, said out loud

Price editor marks the rows that set the carte figure; item edit form shows it when it
differs from the price being typed. Depends on 6 and 8.

## Open

- **French price display.** Showing a maximum and charging less is the safer direction — the
  offence is charging *above* what is displayed — but that is not researched, and the
  liability is the vendor's. Check before slice 8 ships.
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
