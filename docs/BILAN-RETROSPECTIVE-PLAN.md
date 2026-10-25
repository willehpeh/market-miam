# Ce qui se vend — plan

The bilan is captured (`LIVE-MODE-PLAN.md` slice 2b); this plan reads it back (slice 1 shipped, see *Where this stands*). The same dish
judged at the same market over several weeks is `MARKET_MIAM.md`'s *trend data per item per
market*, and it answers demand uncertainty: what to load in the van. This is decision 14a of
`LIVE-MODE-PLAN.md` coming due. Everything is read-side, off `MarketDayBilanRecorded` as it
already lands: no new event, command or capture screen.

## What the three outcomes actually are

*Épuisé* · *Bien vendu* · *Moins bien vendu* are a quantity signal, not a quality rating:

| Outcome | What the morning was | What it argues for |
|---|---|---|
| `sold_out` | demand ran past what came off the van | bring more, or accept selling out early on purpose |
| `did_well` | the tray emptied at about the right rate | that quantity was right |
| `did_not_do_well` | it came home | bring less, or leave it home |

Aggregated, that is a packing list.

## Why there are no charts here

1. The sample is tiny (four data points a month at a weekly market); a percentage at n=3
   claims a precision the data does not have.
2. The question is *which* dishes go in the van, stay home, or travel to Antony but not
   Sceaux; sorting questions are answered by lists.
3. A phone, one hand, market sun: words at 16px beat any chart.

So aggregate into piles, not into a number.

## The three display primitives

Mockups at 360 px: [`design/ce-qui-se-vend-screens.html`](design/ce-qui-se-vend-screens.html)
(fonts inlined), rendered as [`a-menu-editor`](design/ce-qui-se-vend-a-menu-editor.png) ·
[`b-market-record`](design/ce-qui-se-vend-b-market-record.png) ·
[`c-dish-transpose`](design/ce-qui-se-vend-c-dish-transpose.png). Screens there, reasoning
here.

**1. The pile.** Every (dish × market) pair falls into exactly one of five, named in market
French rather than the form's neutral radio labels:

| Pile | Rule |
|---|---|
| **Toujours épuisé** | ≥3 bilans, `sold_out` in at least half |
| **Ça part bien** | ≥3 bilans, `did_well` in at least half |
| **Il en reste** | ≥3 bilans, `did_not_do_well` in at least half |
| **Ça dépend des jours** | ≥3 bilans, no outcome reaching half |
| **Trop tôt pour dire** | 1–2 bilans; shows its answers, claims nothing |

Plus **Jamais apporté ici**: carte dishes with no bilan at that market, collapsed and last.
Ties break toward the most recent bilan. No pile shows a percentage or an average. *Il en
reste* was *Ça reste* until 2026-08 (decision 22).

**2. The streak.** Under each dish, its last bilans as short tokens, *Épuisé* · *Bien* ·
*Reste*, oldest → newest:

```
Il en reste                                                ← the pile heading
  Chorba                                            6,00 €
  Reste · Bien · Reste · Reste           depuis le 12 juil.
```

Chronological, as the only element that can show a trend. Capped at six, prefixed `…` when
truncated, with the date of the oldest shown. Tokens rather than full labels: decision 13.

**3. The line in the menu editor.** The pile name alone, one `text-xs` line under the dish
row while the vendor ticks the menu for that market: *Toujours épuisé*, *Il en reste*. Not
the streak (see *Mobile*): the editor wants the conclusion, the record page the evidence.

## Where it hangs, in value order

**A — the menu editor row. Shipped.** `/dashboard/menus/:marketId/:date` already knows the
market, so the line needs no market label. Vertical, below the whole row and inside the same
card, indented to the dish name rather than inside the name column (cf.
`archive/MARKET-PRICING-PLAN.md` decision 6's neighbour). Silent for a dish never brought here.

**B — `Ce qui se vend à <marché>`. Deferred.** A second link on the market card in *Vos
marchés*, under *Tarifs* (`archive/MARKET-PRICING-PLAN.md` decision 2). The five piles, each
a short list of dishes with their streaks and each dish's price at that market, stated and
not interpreted.

**C — `Où ça se vend`, on a catalogue dish. Deferred.** The transpose: one block per market
for one dish, market name, pile and streak each on its own line (a name-and-verdict row
overflows at *Marché de Bourg-la-Reine*). It avoids a (dish × market) matrix and shows the
cross-market finding (*le tajine part à Sceaux et reste à Antony*) that changes a route.

B and C keep their design here for when the trigger fires.

**Not built:** no dashboard card (the bilan prompt owns the looking-back slot, decision 65);
nothing on the bilan screen (*La dernière fois : bien vendu* beside a radio group would
anchor the answer that feeds the aggregate).

## Slices

**Slice 1 — the read, and the editor line. Shipped.** `FindSellingRecord(vendorId)` returning
the vendor's whole set (`archive/MARKET-PRICING-PLAN.md` decision 3's shape);
`GET /selling-record` as its own resource, as prices took `/market-prices` rather than
hanging off `/market-schedules`; the pile rule as a pure frontend function in the shape
`live-status.ts` set; primitive 3 on the menu editor. No new read model, event or migration.

**Slice 2 — surface B. Deferred.** The market page, rendering the same payload in full: one
route, one component, one link on the market card. See *Deferred* for the trigger.

**Slice 3 — surface C. Deferred.** The transpose on a catalogue dish, reusing whatever
slice 2 builds; the two move together.

## Where this stands

**Slice 1 is complete, back and front.** Green on `npx nx test test` (643), `npx nx test api`
(221), `npx nx test vendor-frontend` (461), lint, typecheck, `nx build api` and `nx build
vendor-frontend`. Stryker over `selling-record/` scores 100 % (19 mutants, 19 killed). The
frontend is outside Stryker's net, so `pile.ts`'s four boundaries (threshold, at-least-half
comparison, recency reversal, empty guard) were mutated by hand; each is killed by exactly one
test.

**What exists.** `packages/market-days/src/selling-record/`: `find-selling-record.ts` (the
query), `selling-record-view.ts` (`Bilan` · `ItemRecord` · `MarketRecord` ·
`SellingRecordView`), `find-selling-record.handler.ts` (`execute` reads the window,
`recordsFrom` folds it, `WINDOW_DAYS` 183, `MOST_RECENT` 8), `index.ts`, exported from the
package barrel. Six tests in
`test/src/market-days/selling-record/find-selling-record.spec.ts`, driving the handler against
`InMemoryMarketDayViews` in `find-unrated-market-days.spec.ts`'s idiom. Over HTTP:
`apps/api/src/app/market-days/selling-record.controller.ts` and its three-test spec, with
`SellingRecordController` and `FindSellingRecordHandler` in `market-days.module.ts`.

**No contract tests were needed, and none should be added.** Slice 1 adds no read-model
method; `market-day-views.contract.ts` already pins outcomes through `menusFor`,
date-then-market order (decision 6 rests on it) and vendor isolation on both
`InMemoryMarketDayViews` and `PostgresMarketDayViews`.

**A vendor's history cannot be manufactured.** `setMenu` refuses a past day
(`MarketDayInThePastError`), so an older bilan is unreachable through the API: the API spec
judges one day, the handler spec owns the fold across dates, and a demo back catalogue has to
go at the event log or the read model directly.

### The frontend half

A component spec renders the real component against fake facades; a facade spec wires the
real facade through real reducer and effects to `HttpTestingController`. `menu-editor.spec.ts`
covers the five piles, silence for a dish never brought here, only this market's bilans, the
tie-break, the spinner gate and the fetch; `selling-record.spec.ts` covers asks · loading ·
exposes · fails quietly · does not refetch · refetches after a bilan.

**What exists.** `apps/vendor-frontend/src/app/selling-record/`: `selling-record.ts` (payload
types and the `SellingRecord` gateway), `pile.ts` (the whole rule, returning a `PileName` or
`undefined`), and the facade set on `market-prices/`'s pattern: `.facade` · `.state` ·
`.effects` · `.providers` · `fake.` · `store.` · `http.`. Registered in `app.config.ts`. On
the menu editor: `TONES`, the fourth `loading()` term, the `bilans` lookup and the `.hint`
line.

**Three things the tests forced that the plan had not called:** a failed load releases the
spinner (no piles is a degradation, no menu is an outage); a recorded bilan stales the cached
set (decision 21); `pile()` returns `undefined` for the empty case, so the editor stays silent
and surface B will call it *Jamais apporté ici*.

## The read

The handler folds `MarketDayViews.menusFor(vendorId, from, to)` over six months and joins the
catalogue and the market names, two of the three joins `FindUnratedMarketDaysHandler` makes:

- **No clock, no occurrence expansion, no absence filter.** `outcomes` is non-empty only for
  a day that already accepted a bilan; a called-off day, a day inside an absence and a day
  still trading carry none.
- **Retired dishes drop on the catalogue join**, as for the prompt.
- **The sold-out service log is not a source.** Only recorded bilans count; the marks are the
  bilan's prefill and nothing else.

**Measured, on Node 22.** The fold: 0.027 ms median for a pilot vendor (104 rows → 80
dish×market cells), 0.14 ms for an implausibly busy one (260 rows, 600 cells), 0.23 ms over
five years of pilot data (decision 5's trigger case). The database leg is not measured (no
Postgres in the sandbox) but is the whole cost: a ~104-row prefix scan plus one intra-region
round trip and `pg`'s array/jsonb deserialisation, call it 2–5 ms; the fold is under 1 % of
it. Single-digit milliseconds server-side; on market 4G it is the fourth of four parallel
requests, and a same-table read three times the size of the days feed will not be the
slowest.

Six months, then capped to the last eight bilans per pair: a weekly market gives ~26 to
choose from, a monthly one six. The window bounds the scan; the cap bounds the payload; the
pile rule reads what survives both.

## Mobile is the case, not an edge case

The vendor app is mobile-first and unprefixed: no desktop layout. The chrome is fixed: `main`
is `px-6`, `Card`'s section is `p-6`, a menu-editor row is `p-3` with a `size-5` checkbox and
`gap-3`. Measured:

| Viewport | Card content | Menu row | Under the dish name | Full row, indented |
|---|---|---|---|---|
| 320 px | 224 px | 200 px | **105 px** ≈ 17 char | 168 px ≈ 28 char |
| 360 px | 264 px | 240 px | 145 px ≈ 24 char | 208 px ≈ 35 char |
| 375 px | 279 px | 255 px | 160 px ≈ 27 char | 223 px ≈ 37 char |
| 414 px | 318 px | 294 px | 199 px ≈ 33 char | 262 px ≈ 44 char |

This removed the streak from the editor. `3 derniers bilans : Bien vendu · Épuisé · Épuisé`
is 48 characters: two lines at 375 px, three at 320 px. The worst case,
`3 derniers bilans : Moins bien vendu · Moins bien vendu · Bien vendu`, is 68 characters and
four lines at 320 px: +32 to +64 px per row at a ~16 px `text-xs` line box, twenty times on
a twenty-dish carte. The longest pile name, *Ça dépend des jours*, is 19 characters: one line
at every width above, given the row's full width.

Rules:

- **Nothing scrolls horizontally, so nothing is a table.** Every surface is a stack of blocks
  whose only overflow is down.
- **Everything wraps; nothing truncates.** No `text-overflow: ellipsis` on a pile name or a
  dish name: large text must lose layout, never words.
- **The editor line is inert text and never a link.** The row is a `<label>` wrapping the
  checkbox; an anchor inside it is a nested interactive and a tap that toggles the dish.
  Surface B is reached from *Vos marchés*, never from a row.

## Decisions

Do not re-litigate without a reason.

| # | Decision |
|---|---|
| 1 | **Piles, never scores.** No percentage, average, rank or chart. |
| 2 | **(dish × market), never dish alone.** Prices already vary by market (ADR 0052). |
| 3 | **One query returns the whole set; three surfaces slice it** (`archive/MARKET-PRICING-PLAN.md` decision 3). A pilot vendor (~20 dishes × ~4 markets × ≤8 bilans) is 33 kB JSON, 3.0 kB gzipped; a compact shape (`outcomes[]` plus one `since`) would save only 13 % gzipped, the UUIDs being incompressible. Lever: narrow slice A to `?market=`. |
| 4 | **The pile rule lives in the frontend, the window in the handler.** Thresholds are a UX rule the pilot will move at no migration or rebuild; the window bounds the scan. |
| 5 | **No new read model in slice 1.** The fold is a bounded prefix scan on the key order `0013_market_day_views_key_order` set. **Trigger: the fold shows in a trace, or the window must span years.** |
| 6 | **The streak reads oldest → newest.** Reversed, improvement reads as decline. |
| 7 | **`Ça dépend des jours` is a pile, not a gap.** An inconsistent dish is a real finding. |
| 8 | **Group headings speak market French; the bilan form stays neutral.** A radio label is a verdict the vendor pronounces; a heading describes a pile of trays. |
| 9 | **`Ce qui se vend`, not `Ce qui marche`.** *Marche* collides with *marché* on the same screen. |
| 10 | **Nothing on the bilan screen, nothing on the dashboard.** Anchoring on one, noise on the other. |
| 11 | **The editor line gates the spinner with the other three feeds.** A late fourth feed would reflow every row under the vendor's thumb. |
| 12 | **The pile goes in the editor, the streak stays on the record page.** Forced by the 105 px name column. |
| 13 | **Streak tokens are *Épuisé* · *Bien* · *Reste*, not the form's full labels.** The heading above supplies the full phrase; full labels wrap a five-bilan streak to three lines in a 224 px card. |
| 14 | **The editor line is inert text; colour never carries meaning alone.** A link inside the row's `<label>` is a nested interactive that ticks the dish; every pile and token carries its word (WCAG 1.4.1, `archive/MARKET-PRICING-PLAN.md` decision 7). |
| 15 | **The handler takes `MarketDayViews` and a `Clock`, nothing else.** `FindUnratedMarketDays` reads schedules and the catalogue only to tell a finished day; `outcomes` already does. |
| 16 | **The fold is a private method; the tests stay on the handler.** ADR 0006: public surfaces, not internals. |
| 17 | **Only `bilans` has a meaningful order.** Oldest first (decision 6), from `menusFor`; the order of markets and dishes is incidental, so no test asserts it. |
| 18 | **Three layers own the read side, and this handler is the third.** Projection specs own *events → view*; `market-day-views.contract.ts` owns *what a write does to a row*; a query spec seeds the view through store methods and owns *view → payload* (ADR 0016: the handler sees a port, never an event). |
| 19 | **`pile.ts` gets no spec of its own; the piles are driven through the menu editor.** Pure derivations are tested through their component (`quote`, `hasLiveScreen`, `formatEuros`, `longDate` have no spec). |
| 20 | **The pile line's colour is decoration, and is not tested.** Claiming piles are coloured and bold, withholding ones muted; `--mm-warn`, `--mm-success`, `--mm-danger` clear 4.5:1 on `--mm-surface`. Zero `toHaveClass` assertions; `PileName` is a closed union, so the tone map is exhaustive. |
| 21 | **A recorded bilan stales the cached set; it never patches it.** A patch would be a second fold, free to drift. |
| 22 | **The *did_not_do_well* pile is *Il en reste*, not *Ça reste*.** *Ça reste* can read as *it's still fine* and names no leftovers; *Il en reste* is what a vendor says of a tray that came home. The token stays **Reste**. |
| 23 | **The card is the `<li>`; the `<label>` keeps its own padding.** The pile sits inside the card and outside the `<label>` (decision 14), so border, background and `relative` move to the `<li>`. A padded `<li>` would leave a 12 px ring that looks tappable, so the label keeps `p-3` and the pile line carries `pr-3`/`pb-3`. |

## Deferred — trigger-gated

- **Surfaces B and C — slices 2 and 3.** The per-market page and the transpose on a catalogue
  dish. Deferred: the editor line is where the pile changes a decision; the other two are
  places to go *reading*, which a pilot vendor has not asked to do. No code was written; both
  consume slice 1's payload.

  One knowing gap: decision 12 put the streak on a record page that does not exist, so the
  editor states a conclusion the vendor can check only against memory. **Trigger: the first
  vendor who asks where a pile came from, disagrees with one, or wants to see a dish's record
  across their markets.**

  To watch: one surface now consumes a set sized for three, so a pilot vendor's menu editor
  fetches ~33 kB (3.0 kB gzipped) to render one short line per dish for one market. Still the
  fourth of four parallel requests rather than the slowest; if that changes, narrow surface A
  to `?market=` (decision 3).

- **Splitting *épuisé tôt* from *épuisé en fin de marché*.** *Toujours épuisé* is ambiguous:
  gone at 10h means the van was underloaded, gone at 12h55 means it was packed perfectly.
  Nothing new needs capturing: `ItemMarkedAsSoldOut` carries its time and `market_day_views`
  keeps `closed_at`; the read model does not keep the mark's time. **Trigger: the first pilot
  vendor who says the *épuisé* pile is telling them the wrong thing.**
- **Seasonality.** A six-month window half-straddles the year. **Trigger: a full year of
  pilot data.**
- **The dedicated projection**: decision 5's trigger.
- **Weather, or any external covariate.** Named only to be refused: it asks the vendor to
  trust a model instead of a list they can check.
