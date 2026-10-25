# Live mode — plan

A market day the vendor is trading *right now*: the storefront leads with the market it is
standing in, the day's menu carries per-dish availability, and the vendor closes the day when
they pack up. Wireframe: `tmp/live-mode.png`, not in the repo (its logo and *bientôt épuisé* tag
are not the design).

## Status

**Slice 0 shipped. Slice 1 is complete**: its Shape table, built through HTTP; the doorway card
(decisions 41–43) and the live screen with its rows, épuisé group, pre-live banner, waiting poll
and *En direct* receipt; sold-out greyed in place on the customer's *Prochain marché* card, with
a route-provided feed that polls while broadcasting and re-asks when the tab becomes visible
(decisions 7, 8, 17, 20, 26); and the ops alert, paging through `GET /api/health` and an external
monitor since the free tier has no trigger slot (`O11Y-PLAN.md` step 5).

**Slice 2 is complete**: its Shape table, built through HTTP, with `close` and `reopen` carrying
their *today*, no-op and ended guards. The live screen carries close, the closed state, reopen,
the inert rows and decision 10's editor link; the screens of decisions 51–55 are shipped as those
rows state them. The `FindMarketDay` read is shipped (decisions 58–63): `MarketHours`,
`standingOf` stating `phase` and `nextPhaseInMs` together on both handlers, the live screen's own
`day` slot in place of the list load, `over` as a full state, and one timer plus a visibility
re-ask in place of the 60s poll, deleted along with `RefreshMarketDays`.

**Slice 2b is complete**: the read model on both adapters, outcomes on the occurrence, both
queries; the write path rebuilt whole (decisions 72–74), replacing the per-item shape that shipped
first; the bilan screen (decisions 68, 70, 71, 74), with the *épuisé* prefill a recorded bilan
outranks and reactive branches for an unfinished day (linking to the live screen only where there
is one) and a finished day with no menu; *Faire le bilan* in the live screen's foot below the
close verb; and the dashboard prompt (decision 65), `FindUnratedMarketDays` behind
`GET /market-days/unrated`, a slim payload of its own, seven days back, oldest first, one card
under *Prochain marché* that clears once the bilan is recorded. Two follow-ups shipped after it (decisions 75, 76): a stand
shut before its market opened is *called off*, so the row keeps `closed_at`, the prompt and both
bilan doors pass it over, and the screen says *ce marché n'a pas eu lieu*; and the dashboard
splits its market card into *Aujourd'hui* and *Prochain marché*, which makes the day after a
closed or trading today reachable. *Bien vendu* and *Moins bien vendu* are a working answer. The
rating capture window is settled (decision 50).

**Slice 3's occurrence assembly is done** ahead of the slice. Two modules in the style `market-day-clock.ts` set: `scheduled-days.ts` expands
a schedule over a range and says whether the vendor declared themselves away, which three
handlers had each done for themselves; `day-menus.ts` reads menus, catalogue and prices once for
a range, keyed by market **and** date, and `menuFor` is the only thing that knows the key. It
closed a second shipped defect of decision 56's family (Named limits); the write path, the query
contracts and the rendered output did not move. What remains: the split (`FindNextMarketDay`, a
calendar-only `FindUpcomingMarketDays`), the editor narrowing, and the customer takeover. The
customer gaps left are the freshness label (decision 8),
`pitch` (on the wire, dropped in `toMarketViewModel`) and the hero's prominence, none of which
needs the split.

## Shape

What gets built, in order. Why is in the decisions below.

**Slice 0 — `/carte`. Done.** `app.routes.ts` is a componentless parent holding
`storefrontResolver`, children `''` → `StorefrontPage` and `'carte'` → `CartePage`; a *Notre carte*
row on the home page. Three things the plan did not call:

- **The metadata card moved from `StorefrontPage.ngOnInit` into the resolver**; both pages get
  the same card, no per-page title.
- **The carte renders `DishCard`, and `DishRow` is deleted.** Photo-less dishes get a `bg-canvas`
  panel with the fork-and-knife.
- **`app.routes.spec.ts` fakes `HttpBackend` rather than using `HttpTestingController`**, since
  flushing by hand races the router; it counts requests to prove one fetch serves both children.

**Slice 1 — sold-out, end to end. Shipped whole.** Migration `0014` and the Postgres availability
SQL were written with no Docker available; the container suite has since run and passes.

| | |
|---|---|
| Event | `ItemMarkedAsAvailable`, mirroring `ItemMarkedAsSoldOut` |
| Aggregate | `markItemAsAvailable`; both guarded to *today* |
| Read model | `market-day-view` gains `soldOutItemIds`; store gains `markSoldOut` · `markAvailable`; `setMenu` intersects `sold_out` with the new `itemIds` |
| Query | availability joins onto the occurrence; `inProgress` moves onto the occurrence; the occurrence gains `today` (decision 42); occurrences sort by `(date, startTime ?? '00:00', marketId)` |
| HTTP | `PUT /market-days/:marketId/:date/items/:itemId/availability` → `{ soldOut: boolean }` |
| Vendor | live screen on its own route (decision 41): active rows, *Épuisé* group, pre-live banner, poll while waiting, the explicit *En direct* state when the banner flips (decision 37), `concatMap` on the effect |
| Customer | dishes grey in place on the *Prochain marché* card; poll while live and visible |
| Ops | the stuck-subscription alert from `O11Y-PLAN.md` |

**Slice 2 — close.**

| | |
|---|---|
| Events | `MarketDayClosed`, `MarketDayReopened` |
| Aggregate | `_closed` in `apply`; `close` · `reopen` with idempotence guards; `MarketDayClosedError` from `setMenu`, `markItemAsSoldOut`, `markItemAsAvailable` |
| Read model | `closed` on the row; store gains `close` · `reopen` |
| Query | the vendor's occurrence carries `closed`; the customer's list drops a closed day; `FindMarketDay(marketId, date)` reads one day with no window (decision 50) |
| HTTP | `PUT /market-days/:marketId/:date/closed` → `{ closed: boolean }` (decision 44); `GET /market-days/:marketId/:date` → the occurrence, 404 when the schedule does not cover it |
| Vendor | *Fermer le stand* at the foot of the live screen, no confirm dialog; closed, the screen goes inert, rows untappable as availability controls but still rows (decisions 38, 48), with *Rouvrir le stand* where Close stood and *Modifier le menu* (decision 10's link, landing here) hidden; the card renders *Stand fermé · Rouvrir* and reads `closed` before `items` (decision 51); the pre-live screen gains *Je ne peux pas venir aujourd'hui* (decisions 40, 45) |

Four things the plan did not call, landing with slice 2's backend:

- **`MarketDays.save` lost its `MarketDayId` argument**; all four handlers use the
  `save(aggregate, vendorId)` shape.
- **The `vendorId` metadata stamp is asserted once**, in `vendor-scoped-events.spec.ts`; a
  `no-restricted-syntax` rule in the package's `eslint.config.mjs` makes `VendorScopedEvents` the
  only caller of `append`.
- **The read model's `close` upserts, where the availability marks and `reopen` do not**: a close
  for an unplanned day is decision 40's call-off.
- **`MarketDays` reads the vendor's calendar** (decision 50); `Calendar.apply` now handles
  `MarketScheduleAmended`.

Four more, landing with slice 2's live screen:

- **The editor's exits read `hasLiveScreen(day)` in `live-status.ts`** (decision 27's `today &&
  itemIds.length > 0`), as the card and `awaitingStart` do; `SetMarketDayMenuSuccess` reads it
  after its own patch, so saving today's first menu lands on the live screen.
- **The closed banner outranks the live one**, subline *Vos clients ne voient plus ce marché.*
- **Closed rows sink onto the canvas and lose their border**, text at full strength
  (`disabled:opacity-50` is unreadable in market sun).
- **`.quiet` became a design-system utility**, out of `add-item.ts`; *Fermer le stand* is a neutral
  outline control.

**Slice 2b — outcomes (decision 47).** The three outcomes per item per market day that
`MARKET_MIAM.md` calls post-market tracking.

| | |
|---|---|
| Event | `MarketDayBilanRecorded`: the whole set of `itemId` → `sold_out` · `did_well` · `did_not_do_well`, replacing what was there (decisions 72, 73). No time of its own: the store stamps every event, and a bilan made on Sunday would otherwise claim a time on Saturday |
| Aggregate | outcomes enter `apply`; `recordBilan` guarded to a **finished** day, closed, ended or past (decision 69), and never one called off before it opened (decision 75); an unchanged set is a no-op as `setMenu` is; `MarketDayReopened` clears them (decision 30) |
| Read model | outcomes ride `market-day-view` beside `soldOutItemIds` (decision 14's one row). The retrospective cross-month view stays deferred (decision 14a) |
| HTTP | `PUT :marketId/:date/bilan`, the whole set in one body, setMenu's shape (decisions 72, 73) |
| Vendor | its own route (decision 70), a flat list of radio groups under *Bilan* with *Terminer le bilan* at the foot (decisions 64, 68); the live screen keeps its inert rows and links to it; *épuisé* is pre-selected for a dish marked sold out during service, so a vendor who marked four judges two and the submit carries all six (decisions 49, 72); the dashboard prompts for an unrated day within 7 days (decisions 65, 72) |

**Slice 3 — *en direct*.** The query split (`FindNextMarketDay` + a calendar-only
`FindUpcomingMarketDays`); occurrence assembly given one home (shipped ahead, see Status); the
editor narrowed to the next day. Customer: the takeover hero (market, hours, street **and pitch**,
plumbed through `storefront-view-model.ts` for the first time), rows with availability, the
freshness label, and *Marchés suivants* (already excludes the featured day, decision 33).

## Decisions

Numbers are cited elsewhere and are never renumbered or merged. Each row states the final rule.

| # | Decision |
|---|---|
| 1 | **Open is derived, close is an event.** Live = `inProgress && !closed`; no `MarketDayOpened`. A forgotten open tap would switch the feature off in the window it exists for; a forgotten close leaves today's behaviour |
| 2 | **`MarketDayClosed` is an early `endTime`.** `notYetEnded` learns about it, the day leaves the customer's view (the vendor keeps it), `inProgress` goes false, the storefront falls back to the normal page |
| 3 | **Split the query.** `FindNextMarketDay(vendorId)` → one occurrence + dishes + availability + live/closed; `FindUpcomingMarketDays` becomes a pure calendar read. Contradicts `archive/MENU-DU-JOUR-PLAN.md` decision 5; removes the `days().find(c => !c.absent)` scan at `next-menu-card.ts:38` |
| 4 | **No `FindCurrentMarketDay`.** Decision 1 makes *current* mean *next, after its `startTime`* |
| 5 | **The menu editor narrows to the next market day.** A hand-typed URL for another day falls into the existing *Ce marché n'est plus programmé* branch. *Plan later in time* is the trigger for `FindMarketDay(marketId, date)` |
| 6 | **Sold-out is reversible: `ItemMarkedAsAvailable` mirrors `ItemMarkedAsSoldOut`**, per-item and timestamped, not a whole-set replace. Does not extend ADR 0047: the menu is a plan, availability a stream of moments |
| 7 | **The undo does not sit next to the action.** Sold-out dishes leave the vendor's active list for an *Épuisé* group at the bottom; restore is a tap inside it, with no toast, timer or confirm dialog. The customer list does not re-sort |
| 8 | **The customer page polls the storefront endpoint every 60s while live and visible, and re-fetches on `visibilitychange` → visible.** *maj. il y a X min* counts from the last successful fetch; failures leave the page live with a stale timestamp |
| 9 | **Per-variant sold-out stays deferred.** A variant dish is one row on the live screen and greys whole for the customer; `variantName` on `ItemMarkedAsSoldOut` is additive later (ADR 0033). **Trigger: the first pilot vendor who puts a variant dish on a live menu** |
| 10 | **Two vendor routes.** `/dashboard/menus/:marketId/:date` stays the planner; live gets its own route. The card links to the editor while the day has no menu and to live once it does (decision 27). The live screen keeps a discreet *Modifier le menu* link until the market ends (decision 63); Close sits at the bottom, below the épuisés group |
| 11 | **Close is reversible: `MarketDayClosed` / `MarketDayReopened`**, per-moment and timestamped. The vendor's list keeps a closed day until its `endTime` carrying `closed: true`; the card renders *Stand fermé · Rouvrir* (decision 45); `FindCustomerStorefrontHandler` drops that date+market from *Prochains marchés*. Reopening past `endTime`: decision 50 |
| 12 | **Live requires a non-empty menu**: `inProgress && !closed && items.length > 0`; otherwise the normal storefront with the *En cours* badge. The vendor's card during a live market with no menu reads *Vous êtes au marché · aucun plat au menu* |
| 13 | **Two terms, not three.** *En cours* = the market is running (`inProgress`); *en direct* = the vendor is broadcasting today's menu (decision 12). The upcoming list excludes the featured or closed day (decisions 11, 33). `NEXT_BEHAVIOURS.md`'s *open market day · close market day* is retired by decision 1 |
| 14 | **Live state extends `market-day-view`**: one row per `(vendor, market, date)` gaining `soldOutItemIds` and `closed`; the store keeps intent methods (`markSoldOut` · `markAvailable` · `close` · `reopen`); `setMenu` intersects `sold_out` with the new `itemIds`, mirroring `market-day.ts:24`. `menusFor(vendorId, from, to)` narrows to a point lookup, named like `forDay` |
| 14a | **The plan/outcome split is the waste-watch seam, not this one.** The retrospective view, keyed by dish across months, is built when something asks. **The trigger has fired**: loading the van asks it, and `BILAN-RETROSPECTIVE-PLAN.md`'s `FindSellingRecord` folds `menusFor` over six months with no new read model |
| 15 | **Occurrence assembly gets one home**: expand recurrence → apply absences → join facts → apply temporal predicates. Temporal predicates are time-driven, so recurrence is expanded at query time; no denormalised `next-market-day-view`, and this system has no scheduler |
| 16 | **All four commands require the day to be *today*** (and, per decision 29, not closed): `MarketDayNotTodayError`. Availability is a claim about right now, and the write path refuses calendar state off an eventually consistent read model. Marking at 6h is legal. Lifted for the bilan by decision 69 |
| 17 | **The carte moves to its own `/carte` page permanently.** `app.routes.ts` becomes a parent holding the resolver, `''` → `StorefrontPage`, `'carte'` → `CartePage`; slice 0. `RenderMode.Server` on `**` covers it; the poll (decision 8) moves to the parent. Discovery: a visible *Notre carte* entry on the home page |
| 18 | **Slices: (0) `/carte`, (1) sold-out end to end, (2) close, (3) *en direct* takeover**; decision 47 inserts 2b without renumbering. Slice 1 has no takeover. Slice 1 moves `inProgress` onto the occurrence from `find-customer-storefront.handler.ts:51` |
| 19 | **`PUT /market-days/:marketId/:date/items/:itemId/availability`, body `{ soldOut: boolean }`**: one idempotent route behind both commands, void response. Breaks the one-route-one-command style so a phone retrying on bad signal is safe. Scoped by decision 72: the bilan submits whole |
| 20 | **Accessibility ships in slice 1.** `aria-live="polite"` on the dish list only; availability is text, never colour (no `DISPONIBLE` / `BIENTÔT ÉPUISÉ` badges); a sold-out row stays tappable; the pulse dot is `aria-hidden`, its animation gated on `prefers-reduced-motion`. Vendor side: focus moves when a tapped row leaves the list, and the move is announced |
| 21 | **All liveness stays server-side; the client only re-asks.** The customer frontend gets `Clock` from `@market-miam/common` as an Angular provider; *maj. il y a X min* is `now − lastSuccessfulFetch`, not a tick counter |
| 22 | **`concatMap` on the availability effect**, not `market-day.effects.ts:37`'s `switchMap`, which would cancel in-flight taps. **Named limit: two devices can 409 each other**; retry-on-409 if it appears |
| 23 | **A second demo vendor that is always live**, scheduled `00:00–23:59` every weekday, menus scripted a year ahead by a one-off `PUT` loop, on its own subdomain beside `demo.marketmiam.fr`. Sold-out is demonstrated live during a call, not seeded; the website keeps a screenshot for the épuisé state |
| 24 | **No new spans or span attributes; the stuck-subscription alert moves from evidence-gated into slice 1.** A lagging projection now means a sold-out dish stays on sale. Events are the analytics record, so `O11Y-PLAN.md`'s `menu.item_count` precedent is not extended and there is no frontend telemetry (ADR 0026 bootstraps in `apps/api` only) |
| 25 | **Occurrences sort by `(date, startTime ?? '00:00', marketId)`**, slice 1. `find-upcoming-market-days.handler.ts:44` sorted by date alone and `postgres-market-schedule.views.ts:18` returns `ORDER BY seq`. The fallback matches `hasStarted` at `market-day-clock.ts:33` |
| 26 | **The live predicate is slice-monotone**: slice 1 `inProgress && items.length > 0`, slice 2 adds `&& !closed`, slice 3 changes rendering only. One expression gates the customer takeover and the customer poll |
| 27 | **The vendor's gate is `today && items.length > 0`.** Before `startTime` the live screen shows *« Vos clients verront ce menu à partir de 8h00 »*, a stated boundary, not a countdown, and polls until live, then stops |
| 28 | **Slice 1's gate is read from the event log by hand, with no threshold**: of market days with a `MarketDayMenuSet`, how many saw an `ItemMarkedAsSoldOut`? Read in psql once the pilot has traded market days with a menu. **If the answer is "they didn't tap it", slice 2 still ships** |
| 29 | **Close is a phase boundary on the aggregate.** `_closed` enters `apply`; `markItemAsSoldOut`, `markItemAsAvailable` and `setMenu` throw `MarketDayClosedError` (a `DomainError` → 400) once closed; redundant close and reopen are silent no-ops (decision 36). `setMenu` is included because it clears sold-out at `market-day.ts:24` |
| 30 | **`MarketDayReopened` clears recorded outcomes.** Built in slice 2b; `MarketDayMenuSet` clearing sold-out at `market-day.ts:24` is the precedent |
| 31 | **The small ones**: `apply` for `ItemMarkedAsAvailable` removes the id from `_soldOut`; sold-out survives close → reopen; erasure needs no change, since the new events carry no PII and `VendorErasure` still does not rebuild this read model |
| 32 | **No forward test plan; outside-in TDD.** (a) New store methods join `market-day-views.contract.ts`, not just the adapter the driving test touched. (b) The poll's *should we be polling?* gate is an extractable predicate, separate from the interval |
| 33 | **The list always drops the day featured above it, titled *Marchés suivants***: *Prochain marché* + *Marchés suivants* in normal mode, the hero + the same list live. Slice 0; `tmp/too-much.png` showed the conditional exclusion's duplicate. `MAX_UPCOMING` untouched |
| 34 | **The model's word is *item*, repo-wide.** `dishes` DTO fields, `Dish*` types and dish-named files renamed across API, frontends and tests; the route reads `items/:itemId`. *Plat* in French labels is untouched. Kept: the Cloudinary `dishes/` folder, and history |
| 35 | **Availability commands carry no clock time; the server stamps it.** `MarkItemAsSoldOut` loses its `time` field, `MarkItemAsAvailable` is born without one; the handler reads `Clock.now()` once and writes the event's `time` via `parisWallClock`, the same `Clock` that feeds `_today`, so a device clock cannot contradict the guard |
| 36 | **Re-stating availability is a no-op, not an error.** `markItemAsSoldOut` on an already-sold-out item (and its mirror) returns without raising; `ItemAlreadySoldOutError` and `ItemAlreadyAvailableError` are deleted. A wrong claim (`ItemNotPlannedError`, `MarketDayNotTodayError`) stays an error |
| 37 | **The pre-live banner's slot flips to an explicit, server-said *En direct* state, the broadcast receipt.** It is the one change on the vendor's screen the clock causes rather than the vendor, so it must announce itself |
| 38 | **Close has no confirm dialog, and the closed live screen is a full state**: rows inert (decision 48), *Modifier le menu* gone, *Stand fermé* with *Rouvrir le stand* where Close stood. Mistap protection is placement (decision 10); *Rouvrir* is the undo |
| 39 | **Sold-out stays a single tap; double-tap is rejected, inline arm-then-confirm is the recorded fallback.** Double-tap collides with zoom and screen readers' activate gesture. **Trigger: reversal pairs in the pilot log, or the vendor reports mis-taps**; the fix turns the row into *Confirmer épuisé ?* on the first tap, auto-disarming after a few seconds |
| 40 | **The pre-live screen offers *Je ne peux pas venir aujourd'hui*, backed by the existing close command**, slice 2. Absence was rejected as the verb: it cannot be reopened. Copy: decision 45 |
| 41 | **The live screen lives at `/dashboard/live/:marketId/:date`, unguarded: a reactive guard state, not a route guard.** A hand-typed non-today date renders the equivalent of the editor's *Ce marché n'est plus programmé* branch. A param-less `/dashboard/live` cannot address a closed morning market while an evening one runs |
| 42 | **The occurrence carries a server-said `today` flag**, stamped in the upcoming query handler from the `Clock` that feeds `inProgress`; vendor payload only, query-time, no read-model column. Replaced by `phase`, decision 56 |
| 43 | **The dashboard card's live action reads *Suivre le marché*.** It must hold from midnight to close; *en direct* is reserved for broadcasting (decision 13) |
| 44 | **`PUT /market-days/:marketId/:date/closed`, body `{ closed: boolean }`**: one idempotent route behind `CloseMarketDay` and `ReopenMarketDay`, void response; neither command carries a time, the handler stamps from `Clock` (decision 35) |
| 45 | **The closed family is one state with two doors.** *Fermer le stand* and *Je ne peux pas venir aujourd'hui* both append `MarketDayClosed` and land on *Stand fermé · Rouvrir le stand*; no *Ouvert* label. Fallback: a closure stamped before `startTime` is *never came*. **Trigger: the vendor asks what *Rouvrir* means on a day they did not attend** |
| 46 | **The épuisés group heading is *Épuisés***, plural, no noun. The move announcement is `${item.name} épuisé` (`live-screen.ts:171`), so the singular put one word a breath apart meaning two things |
| 47 | **Rating is its own slice, 2b, after close and before the takeover.** Close is a prerequisite; rating's value depends on the vendor closing at all. Capture-only declined: with one pilot vendor the perishable data is a handful of days |
| 48 | **The closed screen has two readings: availability inert, rating live.** *Inert* means the rows stop being availability controls, not that they stop being rows. Revised by decision 70: the rows stay as slice 2 shipped them |
| 49 | **The sold-out outcome is derived from the service log and overridable; the vendor judges only the rest.** A vendor who marked four dishes épuisé arrives at four answered and two to judge; the event records what the vendor said, not what the log inferred |
| 50 | **A closed day is always the vendor's to view; only reopening stops at `endTime`, decided by the aggregate holding the hours.** `FindMarketDay(vendorId, marketId, date)` is a point lookup; `MarketDays` reads the vendor's `Calendar`, so `reopen` raises `MarketDayEndedError`. Revises decision 11. Decision 16 stands: `Calendar` is a strongly consistent aggregate, not a read model. **Trigger for materialised occurrences: pre-orders or reservations** |
| 51 | **The card reads `closed` before it reads `items`**: *Stand fermé · Rouvrir* → the live screen, whatever the menu says, or a closed day's card would read *Planifier le menu* into an editor whose save decision 29 refuses. Door and navigation revised by decisions 55 and 53 |
| 52 | **The close door's verb flips at `startTime`.** The live screen's foot reads `closed → Rouvrir le stand`, else `inProgress → Fermer le stand`, else *Je ne peux pas venir aujourd'hui*, gated `today && !inProgress` rather than `awaitingStart`: the banner is a claim, the door an offer, true with an empty menu |
| 53 | **The closed state renders wherever the day renders, and closing never navigates.** The editor gets the same *Stand fermé · Rouvrir le stand* as a shared component in place of its list and *Enregistrer*. Revises decision 51. Browser-back otherwise lands on an editor whose save fails silently (`SetMarketDayMenuFailure` is unreduced, `navigateAfterSave$` fires only on success) |
| 54 | **No automatic close at end of day; *the day is over* is a phase, and 2b's gate widens to closed or ended** (`setMenu` and the availability pair keep decision 29's boundary). A scheduled close would record a false early `endTime` (ADR 0049). Widened again by decision 69 |
| 55 | **The call-off lives on the dashboard card, for any today, and the editor has no door.** The live screen keeps its own (decision 52); the editor keeps only its closed branch (decision 53). Revises 51 and 52. Any today, since a door that comes and goes with the menu is a rule the vendor cannot see |
| 56 | **The occurrence carries one server-said `phase`, clock truth only**: `'future' \| 'due' \| 'trading' \| 'over' \| 'past'`, replacing `today` and `inProgress`, computed once in `market-day-clock.ts` for both handlers. The customer's `inProgress` stays on the wire, derived in `find-customer-storefront.handler.ts` as `!day.absent && day.phase === 'trading'`. `find-market-day.handler.ts` had read every past day as in progress. `closed` and `absent` stay orthogonal |
| 57 | **The upcoming list keeps its ended-day filter; a finished day is reachable only through the point lookup.** Consequence: 2b needs its own entry point through `GET /market-days/:marketId/:date`, not the card |
| 58 | **The live screen reads one day, by id, into its own `day` slot beside `days`**, with its own loading and not-found states; it stops calling `load()`; `patchDay` patches both. Not an upsert into `days`, which `LoadMarketDaysSuccess` replaces wholesale |
| 59 | **The server says how long the current phase has left; the screen schedules one re-ask off it.** `nextPhaseInMs` beside `phase`, from the same computation, on both handlers; one timer instead of polling, plus a re-ask when the tab becomes visible. ~2 requests per market rather than ~60 |
| 60 | **`over` is a full state on the live screen; `past` keeps the guard until something links to it.** `over`: *Marché terminé*, rows inert (decision 48), empty foot, no close verb, no reopen (`reopen` raises `MarketDayEndedError`). The rows decline marks the aggregate would accept. Decision 70 made the foot a link to the bilan |
| 61 | **`nextPhaseInMs` is present only for the three today phases**: `due` → `startTime`, `trading` → `endTime`, `over` → midnight; optional on the wire. `LocalDate.daysUntil` (`local-date.ts:54`) parses as UTC, an hour wrong across DST; `hasLiveScreen` (`live-status.ts:9`) is already the guard. **Trigger: a second reader** |
| 62 | **The missing-hours fallback becomes a `MarketHours` value object**, with `nextPhaseInMs`. `MarketHours(startTime?, endTime?)` in `market-day/`; `opening()` and `closing()` apply *no `startTime` is 00:00, no `endTime` is 23:59* once; `hasStarted`, `notYetEnded`, decision 25's sort and the aggregate's `hasEnded` delegate. The wire keeps `startTime?: string`. The rule had been written four times (`market-day-clock.ts:34,38`, `find-upcoming-market-days.handler.ts:53`, `market-day.ts:164`). `phaseOf`'s `'00:00'`/`'23:59'` (`market-day-clock.ts:51,54`) stay: a different rule |
| 63 | **The *Modifier le menu* link closes with the market; `setMenu` does not.** The link gates on `closed \| over` while the aggregate accepts a menu for an ended day. Guarding `setMenu` would need the clock plumbed through the command and reverse decision 54; the door stays open by URL |
| 64 | **The bilan rows carry the three-way choice (*Moins bien vendu · Bien vendu · Épuisé*) under a *Bilan* heading; the foot carries *Terminer le bilan*.** Revised twice: the rows belong to the bilan route (decision 70), and the foot is the save (decision 72) |
| 65 | **The dashboard prompts for an unrated day within the last 7 days**: ended, carried a menu, some planned item has no outcome, *planned* read against the catalogue join so a retired dish cannot nag forever. Window: decision 69; destination: decision 70. **Trigger to widen or narrow: the pilot ignoring the prompt, or clearing it every time** |
| 66 | **The outcome command follows the availability pair, rule for rule**: refuses an item the menu never planned; a re-stated outcome is a silent no-op, a changed one appends. Decision 69 drops its today guard; decision 72 makes it whole-set, so the no-op compares the set and one unplanned line rejects the whole submit |
| 67 | **Deleted by decision 72.** It read a sold-out mark with no outcome as answered *épuisé*, making decision 65's predicate *neither an outcome nor a sold-out mark*; the whole-set submit carries prefilled rows, so the contradiction no longer exists |
| 68 | **The bilan is a flat list in catalogue order, each row a radio group**: no épuisés split, no reordering as answers land; three native radios styled as the day picker's segmented row (`add-schedule.ts:127`), the dish name as the group's label. ~116px per segment, past the 44px floor |
| 69 | **The domain says *finished*; the seven days live in the query.** The bilan command drops its today guard; `isFinished` becomes `closed \|\| inThePast() \|\| hasEnded(time)`. Revises 16, 54 and 66 for rating alone. The window is a tunable product number, so it stays out of the aggregate. Revised by decision 75 |
| 70 | **The bilan is its own route, `/dashboard/bilan/:marketId/:date`.** The live screen keeps its inert rows and gains *Faire le bilan* at the foot. Revises 48 and 60. Both read the same `day` slot through `loadDay` |
| 71 | **The bilan route declines what the domain declines.** An unfinished day renders *the market is not over* with a link to the live screen; a finished day with no menu renders an empty bilan; loading and missing follow the live screen (decisions 41, 58). *Terminer le bilan* stays the foot action whether or not every row is answered |
| 72 | **The bilan is submitted whole: one command, one event, replacing what was there.** *Terminer le bilan* is the save. Revises 19 and 64, deletes 67. A bilan is a form made in one sitting, and ADR 0047 is the closer precedent. Cost: an interrupted bilan loses the sitting's answers |
| 73 | **`MarketDayBilanRecorded`, `recordBilan`, `PUT …/bilan`; *bilan* is the act, `outcomes` the entries.** The read model keeps its `outcomes` map; the occurrence is untouched. The per-item `…/items/:itemId/outcome` that shipped first is replaced |
| 74 | **The bilan saves on the response, then goes to the dashboard.** No optimistic patch, no revert: the store takes outcomes from `RecordBilanSuccess` as from `SetMarketDayMenuSuccess`; a failure leaves the form standing and the interceptor surfaces the error |
| 75 | **A stand shut before its market opened was called off, not traded, and is never judged.** The read model keeps `closed_at`; `isFinished` becomes `!calledOff && (closed \| inThePast() \| hasEnded(time))` on the aggregate and in `FindUnratedMarketDays`; the occurrence carries `calledOff`; the live screen's `inert` flag splits; the bilan route says *ce marché n'a pas eu lieu*. Migration 0018 rebuilds the read model. Revises decision 69. The line is `opening()`, so an untimed day counts as traded |
| 76 | **The dashboard carries two market cards: *Aujourd'hui* and *Prochain marché***: the first today occurrence and the first after it, from one component; with neither day one card keeps decision 57's *aucun marché dans les 8 prochaines semaines*. The single card pinned to a closed or trading today left tomorrow unplannable. The bilan prompt stays below both |

## ADR

[0049 — A market day opens by the clock, closes by hand](adr/0049-market-day-opens-by-the-clock-closes-by-hand.md),
for decision 1. An asymmetric lifecycle in an event-sourced domain is what a later contributor
"corrects", and the reason, asymmetric failure modes, is invisible from the code.

[0051 — A market day is constituted with its market's hours](adr/0051-market-day-constituted-with-its-markets-hours.md),
for decision 50. The repository reading a sibling aggregate and constructing the day with its
hours is a third shape for a cross-aggregate fact, beside the handler passing one (`setMenu`'s
`Menu`) and ADR 0031's domain service. The rule for telling the three apart lived nowhere.

Considered and skipped, because read models, routes and queries are easy to reverse: the query
split (3), live state on the menu row (14), the idempotent availability and close routes (19,
44), server-only liveness (21), the one phase (56; its rule lives in the type's own comment), the
*item* rename (34; 0020's shape exactly). **Still a candidate: the no-op rule (36)**, which deleted
two error types and governs every command in the repo, a scope written nowhere.

## Named limits

Accepted; none block a slice.

- **No presence guarantee.** *On est au marché* is inferred from the schedule, so a vendor whose
  van broke down reads as trading until `endTime` or until they close (ADR 0049). A gating
  `MarketDayOpened` fails false-negative and needs a scheduler (decision 15). If presence-doubt
  proves real, the recorded shape is an **additive** open, `(inProgress || openedToday)`. **Trigger: a
  customer or the vendor reports the page claiming presence that wasn't there, or the vendor asks
  how to signal they're running late.**
- **The phase turns over up to 59s late, never early.** `parisWallClock` reads whole minutes, so
  `nextPhaseInMs` counts to the first minute of the next phase (`untilAfter`,
  `market-day-clock.ts`); counting to the boundary itself would say zero for a whole minute and
  spin. Sub-minute accuracy would mean carrying seconds through `LocalTime`, which is `HH:mm`. **Trigger: a screen that must flip on the second**,
  which no vendor-facing state is.
- **A market crossing midnight cannot work** (decision 16). Pre-existing: `endTime` is a
  `LocalTime` with no next-day concept.
- **Two devices can 409 each other** (decision 22). One vendor, one phone is the real case.
- **Overlapping markets.** The schedule model permits two markets whose hours overlap; one stall
  cannot be at both, and first-by-start-time wins (decision 25). A data-entry mistake, not a rule
  to write.
- **Per-variant sold-out** (decision 9, with its trigger recorded there).
- **Two handlers stamped the same occurrence with different temporal guarantees.** Closed by
  decision 56. It was worse than recorded: the point lookup read every *past* day as in progress.
- **The point lookup answered with another market's day.** Closed by the occurrence-assembly
  extraction. `FindMarketDay` read `menusFor(vendorId, date, date)`, keyed by vendor and range
  rather than market, and destructured `[day]`, so a vendor at two markets on one date read the
  other market's menu, marks and closed state. `menuFor(menus, marketId, date)` is now the only
  reader of that map, and a spec covers the two-market date.
- **The card offers the call-off for the first market of a day only.** `market-day-cards.ts`
  (`next-menu-card.ts` until decision 76) takes the first today occurrence; the later market keeps
  the live screen's door if it has a menu and has none if it does not. **Trigger: a vendor
  schedules two markets on the same date**, at which point the card is the wrong shape for the
  day (decision 25's overlap, one level up).
- **The three outcomes carry no quantity** (slice 2b). Selling 2 of 2 and 18 of 20 both read as
  *sold out*: the trade `MARKET_MIAM.md` made when it superseded the brought/left quantities
  design, since the value is the pattern per item across months.

## Open

| Question | Working assumption |
|---|---|
| French copy: the live hero | Leaning away from the wireframe's *ON EST AU MARCHÉ*, a presence claim derived open cannot back (Named limits). Working direction: *EN DIRECT* + market name + hours; the badge word stays the vendor's *En direct* (decision 13). *Plats préparés ce matin* stays cut. The rest of the copy is settled: decisions 37 (*En direct* · *Vos clients voient ce menu.*), 43, 45, 46 |
| French copy for the ended-but-open live screen | *Marché terminé*, decision 60 |
| The rating capture window (slice 2b) | Dissolved by decision 50: the day is reachable through `FindMarketDay` whenever, so the window is the aggregate's guard and nothing else |
| French copy for the three outcomes (slice 2b) | **Working: *Moins bien vendu · Bien vendu · Épuisé***, worst to best, not settled. *Moins bien vendu* over *mal vendu*, a fact about the tray rather than a verdict on the vendor. To watch: the pair is lopsided (11 characters against 17) and must not wrap, and the words go into event names, so a change is a rename across the log. Ordering is not yet argued for; decision 49 prefills *épuisé* at the far end. **Trigger: the first time the vendor says it back in different words** |
| Dashboard card prominence on market mornings | Undecided. If the dashboard grows other tiles, the market-day card may need to take over the dashboard on market days |
| How a failed availability tap reverts (decision 22 says "visibly") | Silent snap-back of the row, no toast, consistent with decision 7; revisit if the vendor misses reversions |
| Subdomain for the always-live demo vendor (decision 23) | Undecided |
| The HTTP shape for close/reopen (slice 2) | Settled: `PUT …/closed` with `{ closed: boolean }`, decision 44 |
| Whether the takeover keeps the cover photo anywhere | Assumed replaced for the duration: live mode serves someone already on their way |
| The vendor live route's path, and what a hand-typed non-today URL renders | Settled: `/dashboard/live/:marketId/:date`, unguarded, with a reactive guard state, decision 41 |
| Discovery affordance for `/carte` (decision 17) | Shipped as a full-width row under *Prochain marché*: icon, label and *Tous les plats que nous préparons* |
| Is sold-out reversible? | Yes, decision 6 |
| How a customer standing at the stall sees an update | Polling, decision 8 |
| Layout: takeover or section | Takeover, and the carte leaves the page entirely (decision 17) |
| Where the vendor taps *sold out* and *close* | Its own route, decision 10 |
| Naming: *en direct* vs *en cours* | Both, meaning different things, decision 13 |
| `markItemAsSoldOut` has no past-day guard | The day must be today, decision 16 |
