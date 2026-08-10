# Menu du jour — plan

Vendors compose each market day's offering from their catalogue; customers see it on the
storefront. Slices 1–4 (domain, read model, query, HTTP) shipped, plus follow-ups in 3a; the
backend is complete and untouched by a browser. Slices 5–7 remain — both frontends and docs.

## Decisions

Settled by grilling before slice 1. Do not re-litigate without a reason.

| # | Decision | Rationale |
|---|---|---|
| 1 | Feature ends when a customer sees the menu. Sold-out is a **later** slice | A menu nobody sees is worthless to a pilot vendor |
| 2 | One whole-set command `SetMarketDayMenu` → one `MarketDayMenuSet`. Plan/unplan retired | The menu *is* a set; `ItemsReordered` precedent. No prod events existed → no migration, no upcast |
| 3 | Event payload is **thin**: `{ itemIds: string[], marketId, date }`. Catalogue joined at **query** time | Renames/re-pricing propagate to already-planned days. Costs historical record; nothing renders a past menu, and the future three-outcomes event can carry its own snapshot |
| 4 | Full `market-day-view` projection, read as a **window** by (vendorId, from, to) | Consistent with ADR 0016 and every other read. ~~Point lookup~~ — revised after slice 3: the only consumer expands a schedule over a period, so N lookups became one range scan |
| 5 | Menus ride on `MarketDayOccurrence` (enrich `FindUpcomingMarketDays`) | `FindCustomerStorefrontHandler` already composes that handler → one change serves vendor list, editor and storefront. This is `archive/MARKET-SCHEDULE-FOLLOWUPS.md` §5 |
| 6 | Customer: **"Prochain marché" card above the carte** + menus listed inside each Prochains-marchés card | Puts the day's offering above the standing carte without redesigning the hero |
| 7 | Vendor: dashboard card listing the **next 14 days**, tap a day → editor route | Removes an intermediate list screen |
| 8 | Editor opens **blank** *for an unplanned day*. Prefill from the **last menu at that market** deferred | Nothing needs a single-day read; revisit once vendors have used it. **Not** "an already-planned day opens empty" — a planned day prefills from `dishes` on the upcoming payload, or saving would silently wipe the menu |
| 9 | Market day survives until `endTime`, badged **"En cours"** | Customers want the menu *during* the market. Interim — superseded by live mode |
| 10 | Absent days: menu suppressed **in the query**, editor read-only | Occurrence already carries `absent`; no cross-aggregate coupling |

Small rules that follow (already implemented where slice 1 covers them):

- Empty menu is legal (`SetMarketDayMenu` with `itemIds: []` clears the day)
- Unchanged menu raises no event; order and duplicates are normalised away
- Menu renders in **catalogue order** at query time — the event's array is a set
- Past days rejected (`MarketDayInThePastError`)
- Removing a dish from the menu clears its sold-out state

## Slice 1 — domain (done)

Commits `8ad0f2a`, `556df45`, `d273bcc`.

Added:

| Path | |
|---|---|
| `packages/market-days/src/set-market-day-menu/` | command, handler, index |
| `packages/market-days/src/market-day/menu.ts` | `Menu` value object — dedup in constructor, `includes`/`equals`/`value()` |
| `packages/market-days/src/market-day/events/market-day-menu-set.ts` | |
| `test/src/market-days/set-market-day-menu/` | spec (12 tests) + `test-data.ts` |

Changed: `Catalogue.confirmAll(itemIds)`; `MarketDays.forVendorAtMarketOn(vendorId, marketId, date)` /
`save(marketDay, vendorId, marketId, date)`; `mark-item-as-sold-out.spec.ts` reworked (7 tests).

Deleted: `plan-items-for-market-day/`, `unplan-item-from-market-day/`, `PlannedItem`, `Quantity`,
`InvalidQuantityError`, `ItemsPlannedForMarketDay`, `ItemUnplannedFromMarketDay`, two specs.

`MarketDay` public surface is now `apply` · `setMenu` · `markItemAsSoldOut`. No accessors,
one private helper. `market-day/` and `set-market-day-menu/` at 100% coverage.

## Slice 2 — read model (done)

`packages/market-days/src/market-day-view/`, mirroring `catalogue-view/`:

| Path | |
|---|---|
| `market-day-view.ts` | `MarketDayView = { marketId, date, itemIds }` — the event payload verbatim |
| `market-day-views.ts` | read port: `menusFor(vendorId, from, to)`, inclusive both ends, ordered by date then market; days nobody planned are absent rather than empty, a day cleared on purpose reads back empty |
| `market-day-view.store.ts` | write port: `setMenu(menu, vendorId)` · `clear()` |
| `market-day-view.projection.ts` | `@CheckpointedProjection('market-day-view')`, `MarketDayMenuSet` only — one-line pass-through |
| `in-memory-market-day.views.ts` | keyed by vendor, then `marketId\|date` |
| `postgres-market-day.views.ts` | upsert on PK `(vendor_id, market_id, day)`; the window read is a prefix scan on that key |

Also: migration `0012_market_day_views.sql` (`day` is text, not date — pg would hand back a JS
Date and the view speaks ISO strings); providers in `market-days.module.ts` and **both**
persistence modules; barrel export.

Tests: `market-day-views.contract.ts` (9, run against both adapters), `market-day-view.spec.ts`
(3, projection), `apps/api/.../market-day-rebuild.spec.ts` (1, clear + replay — drove the command
gateway until slice 4 gave it a route to drive).

Erasure needs no change — market-day events carry no PII, so `VendorErasure` does not rebuild this.

## Slice 3 — query (done)

- `MarketDayOccurrence` gains `dishes: CatalogueViewItem[]` — joined at query time, catalogue
  order, current names/prices; empty when unplanned, suppressed when `absent`
- `FindUpcomingMarketDaysHandler` takes `MarketDayViews` + `CatalogueViews`; catalogue and
  the whole window of menus load once per query, so the query costs three reads flat
- `FindCustomerStorefrontHandler`: `hasNotStarted` replaced by `notYetEnded` (no `endTime` →
  end of calendar day, settling that open question); `UpcomingMarket` gains `inProgress`
  (never true when cancelled; no `startTime` → started once the date arrives) and `dishes`

Tests: 6 new in `find-upcoming-market-days.spec.ts` (join order, current-detail, retired-dish
drop, absence suppression, whole-horizon join); `public-storefront.spec.ts` reworked for the
`endTime` rule (+3: ended-today drop, untimed day, menu vs carte).

## Slice 3a — read model and identity follow-ups (done)

Commits `60d2542`, `79c462a`, `2f6686c`. Came out of a design review of slices 2–3.

- `MarketDayId` (`market-day/market-day-id.ts`) owns the natural key: `streamIdFor(vendorId)`,
  `isBefore(date)`, `snapshot()`. `MarketDay` takes it in place of `marketId` + `date` and
  spreads `snapshot()` into both payloads, so payload and stream address are fed by one
  object. `MarketDays` is down to load and save; `MarkItemAsSoldOutHandler.contextFrom` gone
- Stream key changed to `market-day/${vendorId}/${marketId}/${date}` — free to change while
  no route reaches the handlers, and pinned by a test now that slice 4 will make it permanent
- Rules pinned that had shipped green: store copies menus both ways, `vendorIdFrom` refuses
  an unstamped event, the menu window spans the whole horizon
- The container harness truncated a hand-written table list that never gained
  `market_day_views`; it now reads the list from `pg_tables` after migrating

## Slice 4 — HTTP (done)

Commits `75e4ad8`, `f8511e0`, `c8ced12`, `078f4d2`, `d97f626`. Shape settled by grilling first;
the decisions below are the ones that came out of it.

`PUT /market-days/:marketId/:date/menu` on a new `MarketDayController`, alongside
`GET /market-days/upcoming` — moved off `/market-schedules` while it still had no HTTP client,
so days are read and written under one resource. Body is `{ itemIds }`; clearing a day is an
empty array, not a `DELETE`. Returns void like every other command route.

| Decision | |
|---|---|
| No single-day GET | The editor prefills from `dishes` on the upcoming payload. Retired dishes silently drop from the prefill (correct — they can't be sold); an absent day prefills empty, inert while absence is permanent |
| No schedule or absence validation | Would read calendar state from the market-day write path, off an eventually consistent read model — a vendor could be rejected on a schedule registered moments earlier. A menu for a market the vendor never attends is stored and never surfaces |
| Void response, not the updated view | Read-your-writes is handled by the editor patching its own store: it already holds the catalogue to render the picker, so it has the same ingredients the query joins with |
| `ConcurrencyError` → 409 (`f8511e0`) | Pre-existing app-wide; a lost append arrived as a 500, so every double-submit read as an incident. Filters now come from one shared list — registered separately, a filter added to only the test module passed the whole suite |
| `TZ=Europe/Paris` on the api service (`75e4ad8`) | `DateClock.today()` reads the host's local date, and it also starts the upcoming window: on a UTC host, for an hour or two after Paris midnight the vendor's list showed yesterday's market. **Verified live** — local hour runs +2 against the ISO hour (CEST), which also proves `render.yaml` is a synced Blueprint rather than the export its header suggests, so env vars can be set from the repo |
| `menu.item_count` shipped ahead of its value gate (`d97f626`) | The dish count per day is the baseline waste-watch measures against — wanted from the pilot's first day, not retrofitted over empty history. See `O11Y-PLAN.md` step 4 |

Past-day guard **kept**, against the instinct to drop it: backfill needs a past-days read path
that doesn't exist, so removing it would enable data entry nobody can see. Revisit with
waste-watch, which is retrospective by nature and will want "no editing a day with recorded
outcomes" rather than "no past days".

Tests: `market-day-menu.spec.ts` (3 — vertical through both consumers, and unknown dish → 400),
`market-day-upcoming.spec.ts` (1, moved), `concurrency-conflict.spec.ts` (1),
`tracing/command-gateway.spec.ts` (+1). `market-day-rebuild.spec.ts` now drives the real route.

## Slice 5 — vendor frontend (next)

**Stopping point: the backend is complete and no browser has touched any of it.** Slice 5 is
the first slice with a UI, and the first that exercises `PUT /market-days/:marketId/:date/menu`
outside a spec.

New feature dir mirroring `apps/vendor-frontend/src/app/catalogue/`: port, http adapter, state,
effects, facade, store facade, fake facade, providers. Plus the dashboard card and the editor
route/component.

`GET /market-days/upcoming` exists but **nothing in the vendor frontend consumes it yet** —
the Marchés page lists schedules, not days. That screen is part of this slice.

Carried in from slice 4's grilling, already decided:

- **Patch the store optimistically after a save; do not refetch.** The projection lags the
  response by 4–275ms, so an SPA navigating straight back would render the stale menu until
  something forced a refetch. The editor already holds the catalogue to draw the picker, so it
  can derive the display the same way the query does — filter the catalogue by the chosen ids
- **A planned day prefills** — see decision 8, which does not say what its first three words
  look like they say
- The port is its own thing next to `markets/`, not an extension of
  `http.market-schedules.ts` — the read moved resource in `c8ced12`

Open, in rough order of when they bite:

- Dashboard wants **14 days**, the endpoint serves a **56-day** horizon. Filter client-side, or
  parameterise the query? Client-side is smaller and costs one oversized payload
- Does Prochains-marchés repeat the day shown in the top card? Undecided
- French copy — "Vos menus" fits "Votre vitrine / Votre catalogue / Vos marchés"

House rules that apply: Signal Forms (`@angular/forms/signals`), components depend only on
facades, ports expose Observables, functional NgRx effects bridge port↔store, no lifecycle
hooks.

## Slice 6 — customer frontend

`CustomerStorefront` DTO through `storefront-view-model.ts`; "Prochain marché" card;
`market-card.ts` lists its day's menu.

## Slice 7 — docs

Done for slice 1: `MARKET_MIAM.md` (event catalog, MVP status), `NEXT_BEHAVIOURS.md`,
`WEBSITE-PLAN.md:90`, `O11Y-PLAN.md` (`plan.total_quantity` → `menu.item_count`, since
`Quantity` no longer exists).

Done for 3a: `MARKET_MIAM.md` and `EVENT-SOURCING-ARCHITECTURE.md` both named the old market-day
stream key.

Done for slice 4: `O11Y-PLAN.md` step 4 — the command half of the extractor design is built, not
deferred, and its guard pointed at a spec file (`command-dispatch-tracing.spec.ts`) that doesn't
exist under that name.

`docs/archive/*` deliberately left naming the retired commands and the old
`GET /market-schedules/upcoming` — those are point-in-time records.

Remaining: re-check these after each slice; consider an ADR for the whole-set replace (decision 2).

## Open

| Question | Working assumption |
|---|---|
| ~~`endTime` unset on a schedule day~~ | ~~Fall back to end of calendar day~~ — implemented as assumed (slice 3) |
| Where the upcoming-days port lives in vendor-frontend | Reopened by slice 4: the read is now `GET /market-days/upcoming`, a different resource from `/market-schedules`, so extending `markets/http.market-schedules.ts` no longer follows. A `market-days` port next to it fits the URL and the new feature dir |
| Does Prochains-marchés repeat the day shown in the top card? | Undecided |
| Top card when nothing is planned | Show it — date and place are useful anyway |
| Dashboard card window | 14 days |
| French copy | App says "Votre vitrine / Votre catalogue / Vos marchés"; "Vos menus" fits |

## Known issues (not blockers)

- **`apps/api` transport flake**, on whichever test it lands on — not only `catalogue.spec`.
  Recorded at ~3% per run, but slice 4 saw **three incidents in roughly fifteen full runs** on one
  machine, so the rate is either higher than recorded or load-dependent — worth re-measuring before
  assuming a fix worked. Symptoms seen: `ECONNRESET`, `301` from a server that isn't ours, 5s timeout,
  and during slice 4 two more — a **`401`** where the static verifier always passes, and a failed
  **span assertion** in `tracing/command-gateway.spec.ts`. The 401 fits the existing hypothesis
  (`startApp` leaves the app unbound, so supertest binds an ephemeral listener per request and
  occasionally reaches something foreign); the span one does not, so **"never an assertion diff"
  is no longer true** and shouldn't be used to rule the flake out.
  `app.listen(0)` and `keepAlive:false` were both tried and **neither changed the rate**.
  Next: log the 301's `Location`/remote port; try single-threaded; hoist boot to `beforeAll`.
  Unrelated to this feature.
- **`markItemAsSoldOut` has no past-day guard** while `setMenu` does — you can mark a dish sold out
  on next Saturday's menu. Decide when live mode lands (sold-out probably requires the day to be
  *today*, not merely not-past).

## Commands

```
npx nx test test              # domain + package specs
npx nx test api               # api specs
npx nx run test:test:container  # testcontainers (needs Docker)
npx nx run-many -t typecheck
npx nx run-many -t lint
```
