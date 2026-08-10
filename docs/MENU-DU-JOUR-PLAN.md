# Menu du jour — plan

Vendors compose each market day's offering from their catalogue; customers see it on the
storefront. Slices 1–4 (domain, read model, query, HTTP) shipped, plus follow-ups in 3a; the
backend is complete and untouched by a browser. Slices 5–7 remain — both frontends and docs.
Slice 5 is designed but not started, and opens with two backend changes rather than frontend work.

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
| 7 | Vendor: **one card at the top of the dashboard for the next market day**, tap → editor route | Removes an intermediate list screen. ~~Next 14 days~~ — narrowed while grilling slice 5: the card is a doorway, and one day is the only thing a vendor can act on today. "Plan later in time" is a later slice, cheap once the store already holds the 56-day window |
| 8 | Editor opens **blank** *for an unplanned day*. Prefill from the **last menu at that market** deferred | Nothing needs a single-day read; revisit once vendors have used it. **Not** "an already-planned day opens empty" — a planned day prefills from `dishes` on the upcoming payload, or saving would silently wipe the menu |
| 9 | Market day survives until `endTime`, badged **"En cours"** | Customers want the menu *during* the market. Interim — superseded by live mode |
| 10 | Absent days: menu suppressed **in the query** | Occurrence already carries `absent`; no cross-aggregate coupling. ~~Editor read-only~~ — the slice-5 card skips absent days when picking the next one, so the editor is only reachable for one by hand-typed URL; no read-only mode built |

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

## Slice 5 — vendor frontend (designed, not started)

**Stopping point: the backend is complete and no browser has touched any of it.** Slice 5 is
the first slice with a UI, and the first that exercises `PUT /market-days/:marketId/:date/menu`
outside a spec. Shape settled by grilling. Refactors it deliberately does **not** do, and why:
`VENDOR-FRONTEND-FOLLOWUPS.md`.

House rules that apply: components depend only on facades, ports expose Observables, functional
NgRx effects bridge port↔store, no lifecycle hooks. Signal Forms does **not** apply here — see below.

### 5a — backend first

| Change | Why |
|---|---|
| `FindUpcomingMarketDaysHandler` drops ended days | The card shows one day, so a vendor with markets on consecutive days would be stuck on today's finished market until midnight, unable to plan tomorrow. The rule already exists — `notYetEnded`, `find-customer-storefront.handler.ts:53` — so hoist it and `parisWallClock` into `market-schedule-view/`, filter there, and delete the storefront handler's now-redundant `.filter(...)`. `inProgress` stays, built on the imported predicate. Keeps today's market visible while it runs, which is what a vendor planning that morning needs |
| `endTime` required in the schedule form | Root cause of the above. `add-schedule.ts:228` prefills `08:00–13:00`, so a blank end time means a vendor cleared a filled field; `endTime \|\| '23:59'` then keeps the day alive all evening — and lists a packed-up market to customers. Two lines in the `validate` at `:211`. The domain stays permissive (`endTime?`), so no event, upcast or migration |

Ended days are **dropped, not flagged**: no past-day read path exists anywhere, so nothing could
list them. A later projection can bring them back.

Not built: a "ce marché est terminé" button. Unpersisted it evaporates on refresh; persisted it is
live mode's closing event a slice early, under a name we'll want back — and it would take away the
vendor's ability to plan today, the case that has to keep working.

### 5b — vendor frontend

New feature dir `market-days/` beside `markets/` — port, http adapter, state, effects, facade,
store facade, fake facade, providers. Not an extension of `http.market-schedules.ts`; the read
moved resource in `c8ced12`.

**Dashboard card** — `next-menu-card.ts`, its own component (`dashboard.ts` is already the app's
largest at 262 lines, and the next-day rule is the card's own reason to exist), at the **top** of
the published branch only. An unpublished vendor sees onboarding steps and has no audience yet.

| State | Renders |
|---|---|
| Next day unplanned | "Planifier le prochain menu" · date · market name |
| Next day planned | the same, plus a dish count ("6 plats") |
| Nothing in the horizon | "Aucun marché dans les 8 prochaines semaines" |

The horizon is named in the copy because the endpoint's 56 days is not "never" — a 9-week cadence
has a market the card can't see. Next day = first occurrence that is neither `absent` nor ended.

**Editor** — `/dashboard/menus/:marketId/:date`. **No guard**, against the `editableDish` /
`editableSchedule` precedent: the component derives reactively and the template branches
`loading()` → spinner, occurrence found → editor, otherwise → "Ce marché n'est plus programmé" and a
link back. Save exists only inside the found branch, so a cold refresh cannot render empty and wipe
a menu — the property the guards buy with routing, taken from the template instead. No redirect: a
stale bookmark earns a sentence, not a silent teleport.

Selection is a **plain signal, not Signal Forms**. `add-schedule.ts` already splits this way —
`form()` with `required()` at `:182` for validated fields, a bare `signal` at `:178` for the toggled
collection — and the picker has no validator to write, since an empty menu is legal. Signal Forms'
one real gain here would be `dirty()`, which buys a disabled Save we don't want:

```ts
private readonly touched = signal<ReadonlySet<string> | null>(null);
protected readonly selected = computed(() =>
  this.touched() ?? new Set(this.occurrence()?.itemIds ?? []));
```

Seeds whenever the payload lands; once the vendor toggles anything, no store update can clobber it.
Save is never disabled — the backend raises no event for an unchanged menu.

**State holds `itemIds`, not `dishes`.** Nothing in this app renders the joined dishes: the count is
`itemIds.length`, and the picker's names and prices come from the catalogue store. Mapping
`day.dishes.map(d => d.itemId)` at load makes the optimistic patch *write back the ids you just
sent* — no catalogue in the market-day facade, no second copy of the query's join rule, no
cross-feature provider coupling, no fixture churn. Retired dishes are already dropped server-side,
so the prefill inherits slice 4's behaviour, and the store ends up mirroring the backend's own
`market-day-view.ts`.

**Warm-only loading lives in the facade**, not in each component: `load()` no-ops when already
loaded. `length` is a bad cache key here — empty is a real answer, unlike catalogue or schedules —
so the feature carries an explicit `loaded` flag. `Dashboard`'s existing spinner gate extends to
`!!storefront.view() && !marketDays.loading()`, so the card can never flash the warning before its
data lands. It must **not** copy `dashboard.ts:218`'s unconditional `load()` calls: a re-GET on
returning from a save would clobber the optimistic patch with a projection lagging 4–275ms.

Navigate to `/dashboard` on success, mirroring `navigateToMarkets$`. The card turning into a dish
count is a better receipt than a toast, because it is the actual state.

French labels follow `storefront-view-model.ts:82` — split the ISO string, index a table, no `Intl`
and no `registerLocaleData` anywhere in either frontend. Vendor-frontend has full-word `DAY_LABELS`
at `markets-list.ts:7` and needs a `MONTHS` array beside it, both lifted somewhere importable.

Unreachable, so unhandled: an empty catalogue. Publishing requires a dish, and the card only renders
once published.

### Tests

| Spec | Level | Covers |
|---|---|---|
| `market-day.spec.ts` | facade → effects → HTTP, as `catalogue.spec.ts` | payload → `itemIds`, warm-only `load()` firing one request, PUT url and body, optimistic patch, navigate on success |
| `next-menu-card.spec.ts` | component + fake facade | absent day skipped, count vs prompt, empty warning |
| `menu-editor.spec.ts` | component + fake facade | three branches, toggle, seeding, save payload |
| `dashboard.spec.ts` | extend | card hidden until days load |
| `find-upcoming-market-days.spec.ts` | extend | ended day dropped, in-progress day kept, missing `endTime` survives to 23:59 |
| `add-schedule.spec.ts` | extend | `endTime` required |

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
| ~~Where the upcoming-days port lives in vendor-frontend~~ | ~~A `market-days` port next to `markets/`~~ — settled for slice 5, own feature dir |
| Does Prochains-marchés repeat the day shown in the top card? | Undecided — slice 6, customer side |
| ~~Top card when nothing is planned~~ | ~~Show it~~ — shows date and market name; a planned day adds a dish count |
| ~~Dashboard card window~~ | ~~14 days~~ — one day (decision 7) |
| French copy | Vendor card settled: "Planifier le prochain menu" / "Aucun marché dans les 8 prochaines semaines" / "Ce marché n'est plus programmé". "Vos menus" unused — decision 7 leaves no list screen to name |

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
