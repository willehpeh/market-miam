# Ce qui se vend — plan

The bilan is captured (`LIVE-MODE-PLAN.md` slice 2b) and nothing reads it back. One market
day's three answers are worth very little on their own; the same dish judged at the same
market six Saturdays running is the thing `MARKET_MIAM.md` calls *trend data per item per
market*, and it is the answer to the founding problem — **demand uncertainty**, which for a
traiteur is one concrete question asked at 6h in a van: *what do I load for Sceaux this
morning?*

This is decision 14a of `LIVE-MODE-PLAN.md` coming due. That decision deferred the
retrospective view until something asked the question; loading the van is the question.

Nothing here needs a new event, a new command, or a capture screen. Everything below is
read-side, off `MarketDayBilanRecorded` as it already lands.

## What the three outcomes actually are

*Épuisé* · *Bien vendu* · *Moins bien vendu* look like a quality rating and are not one.
Read against the problem statement they are a **quantity** signal, and the mapping is exact:

| Outcome | What the morning was | What it argues for |
|---|---|---|
| `sold_out` | demand ran past what came off the van | bring more — or accept selling out early on purpose |
| `did_well` | the tray emptied at about the right rate | that quantity was right |
| `did_not_do_well` | it came home | bring less, or leave it home |

That reframing is what makes the aggregate useful without being clever. The vendor is not
being asked to rate their cooking; they are recording, once a week in the rain, whether they
guessed the quantity right. Aggregated, that is a packing list.

## Why there are no charts here

Three reasons, in order of weight:

1. **The sample is tiny and always will be.** A weekly market gives four data points a
   month, and a dish is only on some of those menus. A bar chart of 3/2/1 draws a precision
   the data does not have, and a percentage — *67 % bien vendu* — is an outright lie at n=3.
2. **The question is *which*, not *how much*.** Charts answer magnitude. The vendor's
   question sorts things: which dishes go in the van, which stay home, which travel to
   Antony but not to Sceaux. Sorting questions are answered by lists.
3. **The reading conditions.** A phone, one hand, market sun, a van seat. Words at 16px beat
   any chart at any size, and the app has no chart anywhere else to borrow a language from.

So: **do not aggregate into a number, aggregate into piles.** Three broad categories are
useless as a measurement and excellent as sorting bins — which is what a trader does with
crates all morning anyway.

## The three display primitives

Drawn, at a real 360 px phone width, in [`design/ce-qui-se-vend-screens.html`](design/ce-qui-se-vend-screens.html)
— fonts inlined, so it needs no network — and rendered beside it as
[`a-menu-editor`](design/ce-qui-se-vend-a-menu-editor.png) ·
[`b-market-record`](design/ce-qui-se-vend-b-market-record.png) ·
[`c-dish-transpose`](design/ce-qui-se-vend-c-dish-transpose.png). The reasoning lives here
and only here; that file carries the screens and nothing else, so there is one copy of each
to keep true. (`LIVE-MODE-PLAN.md` points its wireframe at `tmp/live-mode.png`, which is
gitignored and gone — hence committing these rather than linking them.)


**1. The pile.** Every (dish × market) pair falls into exactly one of five, and the pile is
named in market French rather than in the form's neutral radio labels:

| Pile | Rule | Why the wording |
|---|---|---|
| **Toujours épuisé** | ≥3 bilans, `sold_out` in at least half | The form has to say *Épuisé* neutrally; a heading can say what it means |
| **Ça part bien** | ≥3 bilans, `did_well` in at least half | |
| **Ça reste** | ≥3 bilans, `did_not_do_well` in at least half | *Moins bien vendu* is a fair thing to tick once and a scolding thing to read down a column. *Ça reste* is what the vendor says out loud about a tray that came home |
| **Ça dépend des jours** | ≥3 bilans, no outcome reaching half | Not a failure to classify — a real finding. This dish rides on weather or crowd |
| **Trop tôt pour dire** | 1–2 bilans | Shows its answers, claims nothing |

Plus **Jamais apporté ici** — carte dishes with no bilan at that market. Quiet, collapsed,
last, and the only forward-looking pile on the page.

Ties break toward the most recent bilan. No pile ever shows a percentage or an average.

**2. The streak.** Under each dish, its last bilans as **short tokens** — *Épuisé* · *Bien* ·
*Reste* — oldest → newest:

```
Ça reste                                                   ← the pile heading
  Chorba                                            6,00 €
  Reste · Bien · Reste · Reste           depuis le 12 juil.
```

Chronological, not most-recent-first: the sequence is the only thing here that can show a
*trend*, and reversed it makes *getting better* read as *getting worse*. The tokens are the
evidence under the pile's claim, so a vendor who disagrees with the pile sees instantly why
it said that. Capped at six, prefixed `…` when truncated, with the date of the oldest one
shown so staleness is the reader's to judge and not the algorithm's to hide.

*Épuisé / Bien / Reste* rather than the form's full labels, which is a third register for the
same three facts and needs justifying: the pile heading directly above supplies the full
phrase, so the mapping is learnable in one glance, and full labels are what break the row on a
phone — five *Moins bien vendu* chips wrap to three lines inside a 224 px card. The token is
never the only carrier of its meaning; see decision 14.

**3. The line in the menu editor.** The **pile name alone**, as one `text-xs` line under the
dish row while the vendor is ticking the menu for that market — *Toujours épuisé*, *Ça reste*.
Not the streak: it does not fit (see *Mobile* below), and the split is better design anyway.
The editor is a decision taken in seconds and the pile is the conclusion; the streak is the
evidence, and evidence belongs on the page you open when you doubt the conclusion. No
navigation, no new screen, and it lands at the exact moment the data exists to improve.

## Where it hangs, in value order

**A — the menu editor row. Shipped.** `/dashboard/menus/:marketId/:date` already knows the market, so
the line needs no market label. This is the whole feature at its cheapest: the recall
arrives inside the decision instead of waiting behind a link the vendor will not open at 6h.
Vertical, so it does not squeeze the dish name the way an inline cue did (`MARKET-PRICING-PLAN.md`
decision 6's neighbour). It sits **below the whole row**, indented to the dish name rather
than nested inside the name column — the name column is 105 px wide at 320 px and the row's
full width is 168 px, and that difference is the whole margin the line has to live in. Silent
for a dish never brought here — a screen of *aucun bilan* is a nag, not a hint.

**B — `Ce qui se vend à <marché>`. Deferred.** A second link on the market card in *Vos marchés*, under
*Tarifs* — the card is already a container with two destinations (`MARKET-PRICING-PLAN.md`
decision 2), so this is a precedent, not a new pattern. The page is the five piles, each a
short list of dishes with their streaks, and each dish's price **at that market** beside it,
stated and not interpreted: a dish that stays at one market and empties at another where it
is priced differently is a pricing conversation, and the vendor is better placed to have it
than we are.

**C — `Où ça se vend`, on a catalogue dish. Deferred.** The transpose: one **block** per market for one
dish — market name, pile, streak, each on its own line rather than a name-and-verdict row,
which overflows the moment a market is called *Marché de Bourg-la-Reine*. The transpose is
also what keeps this off a (dish × market) matrix, which no phone can hold. This is the cross-market finding a vendor cannot hold in their head — *le tajine part
à Sceaux et reste à Antony* — and it is the one that changes a route, not just a quantity.

B and C keep their design here rather than being cut: the reasoning is what the trigger will
need when it fires, and it cost nothing to keep true.

**Deliberately not built:**

- **No dashboard card.** The dashboard is *today* — two market cards and the bilan prompt,
  and the prompt already owns the looking-back slot (decision 65). A retrospective that
  appears every morning is noise by the third day; this is consulted, not pushed.
- **Nothing on the bilan screen itself.** *La dernière fois : bien vendu* next to a radio
  group would anchor the answer, and the anchored answer then feeds the aggregate that
  produced it. The one screen whose job is an independent judgment stays independent.

## Slices

**Slice 1 — the read, and the editor line. Shipped.** `FindSellingRecord(vendorId)` returning the
vendor's whole set (`MARKET-PRICING-PLAN.md` decision 3's shape), `GET /selling-record` as its own resource — prices took
`/market-prices` rather than hanging off `/market-schedules`, and a cross-day aggregate is no
more a market day than a price list is a schedule — the pile rule as a pure frontend function
in the same shape `live-status.ts` set, and primitive 3 on the menu
editor. No new read model, no new event, no migration.

**Slice 2 — surface B. Deferred.** The market page, rendering the same payload in full.
Nearly free once slice 1 exists — one route, one component, one link on the market card — and
deferred anyway; see *Deferred* below for the trigger.

**Slice 3 — surface C. Deferred.** The transpose on a catalogue dish. Same payload again,
and it reuses whatever slice 2 builds, so the two move together.


## Where this stands

**Slice 1 is complete, back and front.** Green on `npx nx test test` (643),
`npx nx test api` (221) and `npx nx test vendor-frontend` (461), lint, typecheck,
`nx build api` and `nx build vendor-frontend` clean. Stryker over `selling-record/` on the
backend scores **100 % — 19 mutants, 19 killed, none survived**; the frontend is outside
Stryker's net, so `pile.ts`'s four boundaries were mutated by hand instead (the threshold,
the at-least-half comparison, the recency reversal, the empty guard) and every one is
killed by exactly one test.

| Commit | |
|---|---|
| *Read back what the vendor said about a dish at a market* | the first test, and the naive handler that passes it |
| *Separate deciding what to read from deciding what it means* | refactor only — the fold extracted, two loop faults fixed, no spec touched |
| *Show a dish's last eight bilans, not all of them* | the cap; the only test of the six that was ever red |
| *Pin the six-month window at its boundary* | the window constant made load-bearing |
| *Pin the four things the handler does that nothing else owns* | no bilan · partial bilan · two markets one day · empty set |
| *Serve the selling record over HTTP* | `GET /selling-record`, its own controller, module wiring |

**What exists.** `packages/market-days/src/selling-record/` — `find-selling-record.ts` (the
query), `selling-record-view.ts` (`Bilan` · `ItemRecord` · `MarketRecord` ·
`SellingRecordView`), `find-selling-record.handler.ts` (`execute` reads the window,
`recordsFrom` folds it, `WINDOW_DAYS` 183 and `MOST_RECENT` 8), and `index.ts`, exported from
the package barrel. Six tests in
`test/src/market-days/selling-record/find-selling-record.spec.ts`, driving the handler against
`InMemoryMarketDayViews` in `find-unrated-market-days.spec.ts`'s idiom. Over HTTP:
`apps/api/src/app/market-days/selling-record.controller.ts` and its three-test spec, with
`SellingRecordController` and `FindSellingRecordHandler` in `market-days.module.ts`.

**No contract tests were needed, and none should be added.** Slice 1 adds no read-model
method, so there is no new twin behaviour to hold anyone to.
`market-day-views.contract.ts` already runs against both `InMemoryMarketDayViews` and
`PostgresMarketDayViews`, and already pins everything this read leans on: outcomes coming
back through `menusFor`, the window answered in date-then-market order — which is what
decision 6's chronological guarantee actually rests on — and vendor isolation. Decision 5
is what bought that; the projection would have cost a new contract and two adapters.

**A vendor's history cannot be manufactured.** `setMenu` refuses a past day
(`MarketDayInThePastError`), so a second, older bilan is unreachable through the API — which
is why the API spec judges one day and leaves the fold across dates to the handler spec. It
also means a demo vendor's back catalogue cannot be seeded over HTTP; anything wanting
history has to go at the event log or the read model directly.

Five of those six were **green on writing**. That is worth knowing rather than hiding: only
the cap drove new code, and the rest are guards, kept because the mutation run says each one
is killing something. A future test here should expect the same — this handler is small, and
most of what looks like its behaviour belongs to decision 18's lower layers.

### The frontend half

Driven through the seam the frontend actually splits on, which is **not** outside-in through
one surface: a component spec renders the real component against fake facades, and a facade
spec wires the real facade through real reducer and effects to `HttpTestingController`. The
component half came first, because the fake written to satisfy the component is the
specification the real facade then has to meet.

| Behaviour | Where |
|---|---|
| The five piles, one test each | `menu-editor.spec.ts` |
| Silence for a dish never brought here · only this market's bilans · the tie-break | `menu-editor.spec.ts` |
| The fourth term in the spinner gate, and asking for the feed at all | `menu-editor.spec.ts` |
| Asks · loading · exposes · fails quietly · does not refetch · refetches after a bilan | `selling-record.spec.ts` |

**What exists.** `apps/vendor-frontend/src/app/selling-record/` — `selling-record.ts` (the
payload types and the `SellingRecord` gateway), `pile.ts` (the whole rule, returning a
`PileName` or `undefined`), and the facade set on `market-prices/`'s pattern: `.facade` ·
`.state` · `.effects` · `.providers` · `fake.` · `store.` · `http.`. Registered in
`app.config.ts`. On the menu editor: `TONES`, the fourth `loading()` term, the `bilans`
lookup and the `.hint` line.

**Three things the tests forced that the plan had not called:**

- **A failed load must release the spinner.** The editor gates on this feed, so a failure
  that left `loading` set would hold the whole screen behind a spinner over the one feed it
  can do without. No piles is a degradation; no menu is an outage.
- **A recorded bilan has to stale the cache.** The set is cached like prices and the
  catalogue, and a bilan is the only thing that moves it — without the invalidation a vendor
  who records Saturday's bilan sees piles that do not know about Saturday until they reload
  the app. Staled rather than patched: patching would be a second implementation of the
  fold, free to drift from the one the API answers with.
- **`pile()` owns the empty case too.** It returns `undefined` rather than a name, because
  the absence has no single name — the editor stays silent, surface B will call it *Jamais
  apporté ici* — so each surface names it and the rule stays in one place.

**Slices 2 and 3 are deferred** (below). Slice 1 stands on its own: the editor line is the
surface that lands at the moment the data exists to improve, and it needs nothing the other
two would have built.

Two things about running the repo that cost time otherwise, both from `CLAUDE.md`: use
`npm install`, never `npm ci`, and restore `package-lock.json` afterwards; and `npx nx test
test` is the reliable signal — `npx nx test api` flakes on macOS for reasons that are not
your change.

## The read

The handler folds `MarketDayViews.menusFor(vendorId, from, to)` over six months and joins the
catalogue and the market names — two of the three joins `FindUnratedMarketDaysHandler`
already makes, and it is deliberately *cheaper* than that one:

- **No clock, no occurrence expansion, no absence filter.** Every one of those exists in the
  unrated handler to decide whether a day is *finished*. Here the aggregate reads
  `outcomes`, and `outcomes` is non-empty only for a day the aggregate already accepted a
  bilan for — a called-off day, a day inside an absence and a day still trading all carry
  none, so they cost nothing and need no test.
- **Retired dishes drop on the catalogue join**, exactly as they do for the prompt: a dish
  with no row on the carte has no row here either.
- **The sold-out service log is not a source.** Only recorded bilans count. The marks are the
  bilan's prefill and nothing else; two sources for one fact is how the piles start
  disagreeing with the screen the vendor filled in.

**Measured, on Node 22.** The fold itself is nothing: 0.027 ms median for a pilot vendor
(104 rows → 80 dish×market cells), 0.14 ms for an implausibly busy one (260 rows, 600 cells),
and 0.23 ms over five years of pilot data — the case decision 5 names as the trigger, still
a quarter of a millisecond. The database leg is not measured here (no Postgres in this
sandbox) but is the whole cost: a ~104-row prefix scan plus one intra-region round trip and
`pg`'s array/jsonb deserialisation, call it 2–5 ms, against which the fold is under 1 %.
Server-side the request is single-digit milliseconds; what a vendor actually waits for is one
more HTTPS round trip on market 4G, and the editor already makes three in parallel — so the
fourth adds latency only if it is the slowest, which a same-table read three times the size of
the days feed will not be.

Six months, then capped to the last eight bilans per pair in the fold: a weekly market gives
~26 to choose from, a monthly one gives six, and a calendar window alone would punish the
infrequent market for being infrequent. The window bounds the scan; the cap bounds the
payload; the pile rule reads what survives both.

## Mobile is the case, not an edge case

The vendor app is mobile-first and unprefixed throughout — there is no desktop layout to
fall back to, and the reader is holding a phone at a market. The chrome is fixed and known:
`main` is `px-6`, `Card`'s section is `p-6`, and a menu-editor row is `p-3` with a `size-5`
checkbox and `gap-3`. That leaves, measured rather than guessed:

| Viewport | Card content | Menu row | Under the dish name | Full row, indented |
|---|---|---|---|---|
| 320 px | 224 px | 200 px | **105 px** ≈ 17 char | 168 px ≈ 28 char |
| 360 px | 264 px | 240 px | 145 px ≈ 24 char | 208 px ≈ 35 char |
| 375 px | 279 px | 255 px | 160 px ≈ 27 char | 223 px ≈ 37 char |
| 414 px | 318 px | 294 px | 199 px ≈ 33 char | 262 px ≈ 44 char |

**This is what killed the streak in the editor.** The line as first specified —
`3 derniers bilans : Bien vendu · Épuisé · Épuisé` — is 48 characters, so two lines at 375 px
and three at 320 px; with the vocabulary's own worst case,
`3 derniers bilans : Moins bien vendu · Moins bien vendu · Bien vendu`, it is 68 characters
and four lines at 320 px. At a ~16 px `text-xs` line box that is +32 to +64 px on **every**
row, and a twenty-dish carte pays it twenty times: roughly a full extra screen of scrolling
added to the one screen that has to be fast. The longest pile name, *Ça dépend des jours*, is
19 characters — one line at every width above, once the line is given the row's full width
rather than the name column's.

Three rules follow, and they are the reason the rest holds up:

- **Nothing scrolls horizontally, so nothing is a table.** Every surface is a stack of
  blocks whose only overflow direction is down. The one shape that would have forced a
  sideways scroll — dishes × markets as a grid — is precisely what surface C's transpose
  exists to avoid.
- **Everything wraps; nothing truncates.** Tokens wrap in order, so a wrapped streak is still
  a streak. No `text-overflow: ellipsis` on a pile name or a dish name: a vendor who has set
  large text on their phone must lose layout, never words.
- **The editor line is inert text and never a link.** The menu-editor row is a `<label>`
  wrapping the checkbox, so an anchor inside it would be an interactive nested in a label —
  a real accessibility fault, and in practice a tap that toggles the dish when the vendor
  meant to read its record. Surface B is reached from *Vos marchés*, never from a row.

## Decisions

Settled by grilling. Do not re-litigate without a reason.

| # | Decision | Rationale |
|---|---|---|
| 1 | **Piles, never scores.** No percentage, no average, no rank, no chart | At n=3 to n=8 with three unordered-ish categories, every derived number is more confident than the data. A pile is a claim the streak beneath it can be checked against in one glance |
| 2 | **(dish × market), never dish alone** | The clientele is the market's, and the product already accepts this everywhere it matters — prices vary by market (ADR 0052). A carte-wide average over four markets is the one aggregate guaranteed to describe no morning the vendor will actually have |
| 3 | **One query returns the whole set; three surfaces slice it** | `MARKET-PRICING-PLAN.md` decision 3, same reasoning: a pilot vendor is ~20 dishes × ~4 markets × ≤8 bilans — **33 kB of JSON, 3.0 kB gzipped**, measured with real UUID ids — and the alternative is three narrow read-model methods for three views of one fold. A compact shape (`outcomes[]` plus one `since` instead of `{date,outcome}` objects) halves the raw bytes and saves only 13 % on the wire, because the UUIDs are the incompressible part: not worth the shape. If a vendor ever makes the whole set expensive, narrowing slice A to `?market=` is the lever, not re-encoding |
| 4 | **The pile rule lives in the frontend, the window in the handler** | The thresholds are a UX rule the pilot will move (`FindUnratedMarketDaysHandler.WINDOW_DAYS`'s own argument), and moving them must cost no migration and no rebuild. The window is what bounds the scan, so it belongs where the scan is |
| 5 | **No new read model in slice 1** | Decision 14a named the seam but the fold is a bounded prefix scan on the key migration `0013_market_day_views_key_order` already reordered for exactly this window read. Building the projection first shapes a table around a query whose shape the pilot has not yet moved. **Trigger: the fold shows up in a trace, or the window has to span years** |
| 6 | **The streak reads oldest → newest** | It is the only element here that can show direction, and direction is what a mean cannot. Reversed, an improving dish reads as a declining one |
| 7 | **`Ça dépend des jours` is a pile, not a gap** | An inconsistent dish is a real answer — it says *this one rides on the weather, decide on the morning* — and burying it in an *unclassified* bucket would hide the finding that most deserves the vendor's own judgment |
| 8 | **Group headings speak market French; the bilan form stays neutral** | Opposite constraints. A radio label is a verdict the vendor is being asked to pronounce on their own morning, so it must not editorialise; a heading is describing a pile of trays, and *Ça reste* is both kinder and more precise than *Moins bien vendu* five times down a list |
| 9 | **`Ce qui se vend`, not `Ce qui marche`** | *Ce qui marche* is the idiom and would be the better phrase anywhere else. On a screen carrying *marché* six times it is a collision, and the pun costs more than the idiom is worth |
| 10 | **Nothing on the bilan screen, nothing on the dashboard** | Anchoring on one, noise on the other — see *Deliberately not built* above |
| 11 | **The editor line gates the spinner with the other three feeds** | The menu editor already waits on days, catalogue and prices so no row paints a wrong price for a frame. A fourth feed landing late would reflow every row under the vendor's thumb, which is the same failure the dashboard's `loaded()` gate exists to stop |
| 12 | **The pile goes in the editor, the streak stays on the record page** | Forced by the 105 px name column, but right on its own terms: the editor is a decision taken in seconds and wants the conclusion, and a vendor who doubts the conclusion is exactly the vendor who will open the page holding the evidence |
| 13 | **Streak tokens are *Épuisé* · *Bien* · *Reste*, not the form's full labels** | A third register for three facts, bought deliberately: the pile heading above supplies the full phrase so the mapping is learnable at a glance, and full labels wrap a five-bilan streak to three lines inside a 224 px card |
| 14 | **The editor line is inert text; colour never carries meaning alone** | The row is a `<label>` around a checkbox, so a link inside it is a nested interactive and a misfire that ticks the dish. And every pile and token carries its word — WCAG 1.4.1, which the price editor already holds itself to (`MARKET-PRICING-PLAN.md` decision 7), and which a screen read in market sun does not forgive |
| 15 | **The handler takes `MarketDayViews` and a `Clock`, nothing else** | Settled by what the first test forced rather than up front. `FindUnratedMarketDays` reads schedules and the catalogue only to decide whether a day is *finished*; a day carries `outcomes` only where the aggregate already accepted a bilan, so that question is already answered. Retired dishes drop on the frontend's own catalogue join, which every surface makes anyway for names |
| 16 | **The fold is a private method; the tests stay on the handler** | ADR 0006 — public surfaces, not internals. A spec on the fold would pin the shape the slice still needs free, and keeping the tests on the handler is exactly what let the refactor commit move the fold without touching one |
| 17 | **Only `bilans` has a meaningful order** | Oldest first, decision 6, and `menusFor` gives it for free. The order of markets and of dishes within them is incidental — every surface joins the catalogue for names and renders in that order — so no test should assert it, and a test that does will break on a harmless change to the fold |
| 18 | **Three layers own the read side, and this handler is the third** | The projection specs drive real commands through real handlers and poll a real subscription — they own *events → view*. `market-day-views.contract.ts` holds both twins to the store's own rules — it owns *what a write does to a row*. A query spec seeds the view through store methods and drives the handler — it owns *view → payload*, and nothing else. Every existing query spec does this (`find-unrated-market-days`, `find-upcoming-market-days`, `find-market-day`, `find-vendor-catalogue`), and the handler could not do otherwise: it depends on `MarketDayViews`, a port (ADR 0016), so it cannot see an event |
| 19 | **`pile.ts` gets no spec of its own; the piles are driven through the menu editor** | The frontend tests pure derivations through the component that uses them, without exception: `quote` — this same component, this same shape — has no spec, nor do `hasLiveScreen`, `formatEuros` or `longDate`. This plan previously called for an `it.each` table over the rule's boundaries and cited `local-date`, `local-time` and `email`; those are backend, and the whole vendor frontend contains exactly one `it.each`. Reading the boundary off the rendered line is also where the right answer is visible — *Trop tôt pour dire* appearing under the row, not a string returned from a function |
| 20 | **The pile line's colour is decoration, and is not tested** | Every pile says its word, so the tint only speeds up scanning (WCAG 1.4.1, decision 14) — the three piles that make a claim are coloured and bold, the two that withhold one stay muted and regular. The existing `--mm-warn` / `--mm-success` / `--mm-danger` all clear 4.5:1 on `--mm-surface` at this size, so the mockup's darkened variants were not needed as tokens. No spec asserts it: the frontend has zero `toHaveClass` assertions, and a test on a class would pin the decoration and not the meaning. `PileName` is a closed union so the tone map is exhaustive at compile time |
| 21 | **A recorded bilan stales the cached set; it never patches it** | The set is cached like prices and the catalogue — every menu editor opened asks for it, and it is the largest of that screen's four feeds — and a bilan is the only thing that moves it. Patching would mean turning outcomes-keyed-by-item into this shape on the client, which is a second implementation of the handler's fold and free to drift from the one the API answers with. The next screen refetches |

## Deferred — trigger-gated

- **Surfaces B and C — slices 2 and 3.** The per-market page and the transpose on a catalogue
  dish. Deferred as unnecessary for now: the editor line is where the pile changes a decision,
  and the other two are places to go *reading*, which a pilot vendor has not asked to do.
  Nothing is wasted by waiting — no code was written for them, and both consume the payload
  slice 1 already serves.

  **This leaves one knowing gap, and it is the point of the trigger.** Decision 12 split the
  claim from its evidence: the pile goes in the editor, the streak stays on the record page,
  *because a vendor who doubts the conclusion is exactly the vendor who will open the page
  holding the evidence*. That page now does not exist, so the editor states a conclusion with
  no way to check it beyond the vendor's own memory of the market — which for three to eight
  recent mornings at a market they stood at is a real check, just not one the app provides.
  **Trigger: the first vendor who asks where a pile came from, disagrees with one, or wants to
  see a dish's record across their markets.** That vendor is the one the record page was
  designed for, and their asking is the evidence that it is worth building.

  **A second consequence, worth watching rather than acting on.** Decision 3 sends the whole
  set — every market, every dish — because three surfaces were going to slice it. One narrow
  surface consumes it now, so a pilot vendor's menu editor fetches ~33 kB (3.0 kB gzipped) to
  render one short line per dish for one market. Still cheap, and still the fourth of four
  parallel requests rather than the slowest. Decision 3 already names the lever if that stops
  being true: narrow surface A to `?market=`, rather than re-encoding the payload.

- **Splitting *épuisé tôt* from *épuisé en fin de marché*.** The pile *Toujours épuisé* is
  ambiguous today, and the ambiguity is the difference between a triumph and a lost morning:
  gone at 10h means the van was underloaded, gone at 12h55 means it was packed perfectly.
  Nothing new needs capturing — `ItemMarkedAsSoldOut` already carries its time and
  `market_day_views` already keeps `closed_at`; the read model simply does not keep the mark's
  time. **Trigger: the first pilot vendor who says the *épuisé* pile is telling them the wrong
  thing.** Until then the pile states the fact and stops short of instructing.
- **Seasonality.** A tagine in January is not a tagine in July, and a six-month window
  half-straddles that. **Trigger: a full year of pilot data — the phenomenon cannot be seen
  before then, and modelling it earlier is guessing.**
- **The dedicated projection** — decision 5's trigger.
- **Weather, or any external covariate.** Named here only to be refused: it is the obvious
  next thought and it asks the vendor to trust a model instead of a list they can check.
