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
`scheduleId`, because two schedules can sit at one market. `Calendar` owns them
because it is the only thing that knows which markets a vendor attends; it
learns them through schedules, so it is an incidental registry rather than a
natural owner, and that is the whole of the argument. The cost is real:
`Calendar` now describes itself with an "and". Accepted over a `MarketPricing`
aggregate on its own stream, which buys cohesion for a third load per command
and moves the guard below off the aggregate that can enforce it.

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
| Read | Ignore a mismatched override | `priced` matches by view shape: `variants` present → apply the name map, `price` present → apply the number, mismatch → use the catalogue |

A vendor flipping a dish from variants to flat silently drops that market's
overrides for it rather than breaking the storefront.

**`MarketPrices` validates and normalises on construction** (ADR 0007): each
price through the existing cents value object (integer ≥ 0, renamed
`ItemPrice` → `Price` here, since it prices variants too and the old name is
wanted for an item's price *at a market*), each variant key
through `ItemName` — which trims, so ` Margherita ` matches rather than reading
as a variant the dish lacks. `Record` gives key uniqueness free.

**A dish overriding none of its variants is dropped, not rejected.** `{ pizza:
{} }` says what leaving pizza out says, so it is normalised to absence — which
is the sparseness rule already stated, applied to itself. Rejecting it would 400
an ordinary action if the editor ever lets a vendor pick a dish before typing a
price; storing it would make two lists that mean the same thing compare unequal,
so picking a dish and typing nothing would land an event saying nothing.

**Shape before catalogue.** The handler builds `MarketPrices` first and matches
the normalised list against the catalogue second, so a blank variant name is
answered as a blank name rather than as a variant this dish happens not to have.
Same order `menuFor` already uses for `ItemId`.

**`MarketPrice` stays a union of primitives, not a class hierarchy.** Three
functions in `MarketPrices` switch on its kind, and the temptation was to split
it the way `Pricing` splits (flat vs variant). The join is what settled it: the
fourth switch lives in the *read model*, over `CatalogueViewItem`, so one
hierarchy would have to serve both layers and a domain object would have to
reach into the query path to earn its keep. Two guards in `priced` cost less
than that coupling.

**One join point.** `priced(items, prices)` is called from both query handlers;
every read surface inherits the precedence rule from there. It takes one
market's list rather than a market id, so the lookup stays with the handlers —
which already key their work by market — and the function has nothing
market-shaped in it. Named for what it returns, not for a place.

**The carte shows no price, and a market card shows one only while that market
is trading.** *Revises the maximum this ADR decided in its second pass*, which
was never built. The first pass said no price at all; this returns to it, for a
reason that pass did not have.

The maximum was chosen because being charged more than you were shown is the
surprise that costs trust, and a maximum can only surprise downward. It still
displays a figure no customer is ever charged, on the page a stranger is most
likely to land on, and it left a question open that had to be answered before it
could ship: what French price-display law asks of a figure that is not the
price. Showing none closes that question rather than researching it.

A carte is tied to no market, so there is no one price it could honestly name.
It answers *what can they make*; the home page answers *should I go*, and that
is where the money belongs — on a market that is **trading**, the one place a
price is unambiguous, because the customer is at that stall and that stall's
list is what they will pay.

- **A day still to come quotes nothing.** Thursday's card is a plan, not a till.
  Any price on it is today's, and a vendor who reprices that market before
  Thursday would have shown a number they never meant to charge.
- **A carte with no prices reads as a page missing something** — the objection
  that carried the maximum. Accepted: it is a browse of everything ever made,
  and the trading card above it carries the day's prices when there are any.
- **Nothing couples a market's price to a public figure**, so the coupling this
  ADR undertook to surface — in the price editor and the item edit form — has
  nothing left to warn about.

**Frontend only.** `priceLabel` becomes optional in `storefront-view-model.ts`
and is set only where a market is charging: never for `CustomerStorefront.items`,
and for a day's menu only when `inProgress`. `ItemCard`, `ItemSheet` and
`MarketCard` guard the element rather than draw an empty one. The query keeps
sending every price it always sent, so the day a price belongs on the carte
again, it is already there.

**`Menu`, `MarketDayMenuSet` and `MarketDay` are untouched.** Prices are not
snapshotted into the menu event.

## Consequences

### Domain — `packages/market-days/src/`

* `calendar/events/market-prices-set.ts`, added to `CalendarEvent`
* `calendar/pricing/market-prices.ts`; `catalogue/errors/mismatched-pricing.error.ts` — with `Pricing` and `Variants`, which are what throw it, not with the calendar
* `Calendar`: `_prices`, an `apply` case, `setMarketPrices(marketId, prices)` refusing a market it does not schedule. **A client-bug check, not an invariant** — nothing breaks if it passes, since an orphan list is unreachable (below). It earns its place by costing one `if` over state already in memory, and by catching the same failure as the `NoSuchItemError` beside it: prices the vendor believes they set, going nowhere. Its one false rejection — pricing a market whose schedule was cancelled over a seasonal break — is unreachable through an editor that lists markets from schedules
* `Catalogue.confirmPricing` → `Item.confirmPricedBy` → `Pricing.confirmMatchedBy`
* `set-market-prices/` command + handler, loading `Catalogues` alongside `Calendars` — the *handler passes* shape of ADR 0051, as `SetMarketDayMenuHandler` already does
* Controller route and zod request shape (ADR 0046)

### Read model

* `market-prices-view/` — projection, store, in-memory and postgres twins, keyed `(vendorId, marketId)`, `prices jsonb`; new migration
* `market-prices-view/priced-items.ts`, joined via the existing `Promise.all` in both query handlers — a shared module of functions, the shape `market-day-clock.ts` already uses for derivation those same two handlers share

### Frontend

**Read path.** `GET /market-prices` returns the vendor's whole set, which is
what `MarketPricesViews.forVendor` already answers — a point lookup would mean a
narrower read-model method existing to serve one screen. The client filters by
market, and the price editor needs every market anyway to know which of its rows
sets the carte price.

**Screen.** `/dashboard/market-prices/:marketId`, reached from a *Tarifs* link
in the market card. The card stops being one big anchor and becomes a container
holding two links — an anchor cannot nest. Two schedules at one market give two
cards pointing at one prices URL, which is correct rather than confusing: it is
one market and one list. The markets list is **not** deduplicated to markets;
its subject is still *where and when your customers find you*.

**A form with one save, patched on success** — `SetMarketDayMenu`'s pattern, not
the live screen's. Optimism there is justified by market wifi and by a screen
flip standing in for a receipt (`ChangeItemAvailability`, `ChangeStandClosure`,
both rolled back from failure props). Neither applies to a vendor at a table,
and a whole-list rollback would need the previous list carried on failure, which
nothing else here holds.

**Every catalogue dish, in catalogue order** — a row per flat dish, a row per
variant, blank meaning the catalogue price. No picker: it would add an
interaction to save scrolling, and a picker is what makes *selected but priced
nothing* reachable at all. Collapsing variant dishes is a later refinement that
would not change the payload.

**The catalogue price is static text beside a labelled input, never a
placeholder.** A placeholder disappears on focus, so the vendor loses the number
they are comparing against at the moment they type, and screen readers treat it
inconsistently. *Supersedes the placeholder in this ADR's earlier wording.*

**Two row states, each with a non-colour cue** (WCAG 1.4.1):

| State | Means | Shown as |
|---|---|---|
| Overridden | differs from the catalogue, saved | `bg-brand-soft` + *Tarif marché* |
| Dirty | edited this session, unsaved | `border-brand` leading edge, and a count on the save button |

The count is what gives a cleared row something to show — blanking a 12,00 back
to the catalogue price leaves nothing in the field to highlight — and it is how
a vendor forty rows down knows there is unsaved work.

**Menu editor.** The picker reads the catalogue store directly
(`docs/MENU-DU-JOUR-PLAN.md:204`) and would quote list prices while planning a
market, which is the number the customer will not be charged. It shows the
market price, carrying the same *Tarif marché* cue.

**No price editing on a day screen.** Editing a price from a market *day*
implies the price belongs to that day; it belongs to the market, and the edit
would silently move every other day at it. A *Tarifs de ce marché →* link gives
the route without the false implication.

**Pricing gets its own facade and state slice** — `facade` / `state` / `effects`
/ `providers` / `fake` / `store`, as every other area here has. Two unrelated
screens read it, so it does not belong to the schedule slice.

### Deferred

* **Per-day override** — `MarketDayPricesSet` on the market-day stream; `priced` takes a merged list, day over market over catalogue. A separate event, never folded into `MarketDayMenuSet`: `Menu.equals` compares id sets to suppress no-op writes, so a price-only change would compare equal and the event would be dropped silently.
* **Ordering** — the price a customer pays is captured on the order event at order time, not read back from anywhere. Snapshotting prices into the menu event would give stale truth rather than historical truth, and would forfeit the live join that lets a corrected price reach days already planned.
* **Orphan overrides need no cleanup, on one condition: every reader filters through schedules.** The day join is menu ∩ catalogue over occurrences the schedules produce, and nothing else reads a price list at all now that the carte quotes none. That is a rule new readers must follow, not a happy accident — a reader that skips it makes a cancelled schedule's prices live on with no screen able to reach them. Related: *retiring an item doesn't check if it's been planned* (`NEXT_BEHAVIOURS.md`).

### Rejected

| Option | Why not |
|---|---|
| Per-day overrides only | The vendor re-enters a stable fact at every occurrence; one omission is a wrong public price |
| Prices on the catalogue item, keyed by market | Retire and revise would drop overrides naturally, but a dish's price at a market is keyed by market, and the catalogue knows nothing about markets |
| Riding in `MarketScheduleAmended` | Amending hours would have to restate every price |
| A percentage adjustment per market | Cash prices are round — a 10 € dish becomes 12 €, not 11 € |

Builds on ADRs 0007, 0008, 0009, 0033, 0039, 0045, 0046, 0047, 0051.

Shape and slicing: `docs/MARKET-PRICING-PLAN.md` (frontend decisions 1–11).
