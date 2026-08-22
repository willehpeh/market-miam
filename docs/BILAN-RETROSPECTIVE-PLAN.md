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

**2. The streak.** Under each dish, its last bilans as short words, oldest → newest:

```
Tajine d'agneau
Bien vendu · Épuisé · Épuisé · Épuisé          depuis le 12 juillet
```

Chronological, not most-recent-first: the sequence is the only thing here that can show a
*trend*, and reversed it makes *getting better* read as *getting worse*. The words are the
evidence under the pile's claim, so a vendor who disagrees with the pile can see instantly
why it said that. Capped at six, prefixed `…` when truncated, with the date of the oldest
one shown so staleness is the reader's to judge and not the algorithm's to hide.

**3. The line in the menu editor.** The same streak, capped at three, as one `text-xs` line
under the dish name while the vendor is ticking the menu for that market. No navigation, no
new screen, and it lands at the exact moment the data exists to improve.

## Where it hangs, in value order

**A — the menu editor row.** `/dashboard/menus/:marketId/:date` already knows the market, so
the line needs no market label. This is the whole feature at its cheapest: the recall
arrives inside the decision instead of waiting behind a link the vendor will not open at 6h.
Vertical, so it does not squeeze the dish name the way an inline cue did (`MARKET-PRICING-PLAN.md`
decision 6's neighbour). Silent for a dish never brought here — a screen of *aucun bilan* is
a nag, not a hint.

**B — `Ce qui se vend à <marché>`.** A second link on the market card in *Vos marchés*, under
*Tarifs* — the card is already a container with two destinations (`MARKET-PRICING-PLAN.md`
decision 2), so this is a precedent, not a new pattern. The page is the five piles, each a
short list of dishes with their streaks, and each dish's price **at that market** beside it,
stated and not interpreted: a dish that stays at one market and empties at another where it
is priced differently is a pricing conversation, and the vendor is better placed to have it
than we are.

**C — `Où ça se vend`, on a catalogue dish.** The transpose: one line per market for one
dish. This is the cross-market finding a vendor cannot hold in their head — *le tajine part
à Sceaux et reste à Antony* — and it is the one that changes a route, not just a quantity.

**Deliberately not built:**

- **No dashboard card.** The dashboard is *today* — two market cards and the bilan prompt,
  and the prompt already owns the looking-back slot (decision 65). A retrospective that
  appears every morning is noise by the third day; this is consulted, not pushed.
- **Nothing on the bilan screen itself.** *La dernière fois : bien vendu* next to a radio
  group would anchor the answer, and the anchored answer then feeds the aggregate that
  produced it. The one screen whose job is an independent judgment stays independent.

## Slices

**Slice 1 — the read, and the editor line.** `FindSellingRecord(vendorId)` returning the
vendor's whole set (`MARKET-PRICING-PLAN.md` decision 3's shape), `GET /item-records`, the
pile rule as a pure frontend function beside `live-status.ts`, and primitive 3 on the menu
editor. No new read model, no new event, no new route.

**Slice 2 — surface B.** The market page, rendering the same payload in full. Nearly free
once slice 1 exists: one route, one component, one link on the market card.

**Slice 3 — surface C.** The transpose on a catalogue dish. Same payload again.

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

Six months, then capped to the last eight bilans per pair in the fold: a weekly market gives
~26 to choose from, a monthly one gives six, and a calendar window alone would punish the
infrequent market for being infrequent. The window bounds the scan; the cap bounds the
payload; the pile rule reads what survives both.

## Decisions

Settled by grilling. Do not re-litigate without a reason.

| # | Decision | Rationale |
|---|---|---|
| 1 | **Piles, never scores.** No percentage, no average, no rank, no chart | At n=3 to n=8 with three unordered-ish categories, every derived number is more confident than the data. A pile is a claim the streak beneath it can be checked against in one glance |
| 2 | **(dish × market), never dish alone** | The clientele is the market's, and the product already accepts this everywhere it matters — prices vary by market (ADR 0052). A carte-wide average over four markets is the one aggregate guaranteed to describe no morning the vendor will actually have |
| 3 | **One query returns the whole set; three surfaces slice it** | `MARKET-PRICING-PLAN.md` decision 3, same reasoning: a pilot vendor is ~20 dishes × ~4 markets × ≤8 tokens, a few kB, and the alternative is three narrow read-model methods for three views of one fold |
| 4 | **The pile rule lives in the frontend, the window in the handler** | The thresholds are a UX rule the pilot will move (`FindUnratedMarketDaysHandler.WINDOW_DAYS`'s own argument), and moving them must cost no migration and no rebuild. The window is what bounds the scan, so it belongs where the scan is |
| 5 | **No new read model in slice 1** | Decision 14a named the seam but the fold is a bounded prefix scan on the key ADR 0013 already ordered for it. Building the projection first shapes a table around a query whose shape the pilot has not yet moved. **Trigger: the fold shows up in a trace, or the window has to span years** |
| 6 | **The streak reads oldest → newest** | It is the only element here that can show direction, and direction is what a mean cannot. Reversed, an improving dish reads as a declining one |
| 7 | **`Ça dépend des jours` is a pile, not a gap** | An inconsistent dish is a real answer — it says *this one rides on the weather, decide on the morning* — and burying it in an *unclassified* bucket would hide the finding that most deserves the vendor's own judgment |
| 8 | **Group headings speak market French; the bilan form stays neutral** | Opposite constraints. A radio label is a verdict the vendor is being asked to pronounce on their own morning, so it must not editorialise; a heading is describing a pile of trays, and *Ça reste* is both kinder and more precise than *Moins bien vendu* five times down a list |
| 9 | **`Ce qui se vend`, not `Ce qui marche`** | *Ce qui marche* is the idiom and would be the better phrase anywhere else. On a screen carrying *marché* six times it is a collision, and the pun costs more than the idiom is worth |
| 10 | **Nothing on the bilan screen, nothing on the dashboard** | Anchoring on one, noise on the other — see *Deliberately not built* above |
| 11 | **The editor line gates the spinner with the other three feeds** | The menu editor already waits on days, catalogue and prices so no row paints a wrong price for a frame. A fourth feed landing late would reflow every row under the vendor's thumb, which is the same failure the dashboard's `loaded()` gate exists to stop |

## Deferred — trigger-gated

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
