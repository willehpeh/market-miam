# Menu du jour — plan

Vendors compose each market day's offering from their catalogue; customers see it on the
storefront. Slice 1 (domain) shipped; slices 2–7 remain.

## Decisions

Settled by grilling before slice 1. Do not re-litigate without a reason.

| # | Decision | Rationale |
|---|---|---|
| 1 | Feature ends when a customer sees the menu. Sold-out is a **later** slice | A menu nobody sees is worthless to a pilot vendor |
| 2 | One whole-set command `SetMarketDayMenu` → one `MarketDayMenuSet`. Plan/unplan retired | The menu *is* a set; `ItemsReordered` precedent. No prod events existed → no migration, no upcast |
| 3 | Event payload is **thin**: `{ itemIds: string[], marketId, date }`. Catalogue joined at **query** time | Renames/re-pricing propagate to already-planned days. Costs historical record; nothing renders a past menu, and the future three-outcomes event can carry its own snapshot |
| 4 | Full `market-day-view` projection, **point lookup** by (vendorId, marketId, date) | Consistent with ADR 0016 and every other read |
| 5 | Menus ride on `MarketDayOccurrence` (enrich `FindUpcomingMarketDays`) | `FindCustomerStorefrontHandler` already composes that handler → one change serves vendor list, editor and storefront. This is `archive/MARKET-SCHEDULE-FOLLOWUPS.md` §5 |
| 6 | Customer: **"Prochain marché" card above the carte** + menus listed inside each Prochains-marchés card | Puts the day's offering above the standing carte without redesigning the hero |
| 7 | Vendor: dashboard card listing the **next 14 days**, tap a day → editor route | Removes an intermediate list screen |
| 8 | Editor opens **blank**. Prefill from last menu at that market deferred | Keeps the projection a point lookup; revisit once vendors have used it |
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

## Slice 2 — read model

New `packages/market-days/src/market-day-view/`, mirroring `catalogue-view/`:

- `market-day-view.ts` (type), `market-day-views.ts` (read port), `market-day-view.store.ts` (write port)
- `market-day-view.projection.ts` — `@CheckpointedProjection('market-day-view')`, handles `MarketDayMenuSet`
- `in-memory-market-day.views.ts`, `postgres-market-day.views.ts`, `index.ts`
- Barrel export in `packages/market-days/src/index.ts`

Also: migration `database/migrations/0012_market_day_views.sql`; provider in
`market-days.module.ts` (`projections`); store providers in **both**
`apps/api/src/app/persistence/{in-memory,postgres}-persistence.module.ts`;
contract spec + projection spec + rebuild spec under `test/src/market-days/`.

Erasure needs no change — market-day events carry no PII, so `VendorErasure` does not rebuild this.

## Slice 3 — query

- `MarketDayOccurrence` (`market-schedule-view/upcoming-market-days-view.ts`) gains the day's dishes
- `FindUpcomingMarketDaysHandler` takes `MarketDayViews`, joins per occurrence, suppresses when `absent`
- `FindCustomerStorefrontHandler`: replace `hasNotStarted` with the `endTime` rule, add `inProgress`,
  fold dishes into `UpcomingMarket`

## Slice 4 — HTTP

`PUT /market-days/:marketId/:date/menu`. Reading is free — it rides `GET /market-schedules/upcoming`.

## Slice 5 — vendor frontend

New feature dir mirroring `apps/vendor-frontend/src/app/catalogue/`: port, http adapter, state,
effects, facade, store facade, fake facade, providers. Plus the dashboard card and the editor
route/component.

`GET /market-schedules/upcoming` exists but **nothing in the vendor frontend consumes it yet** —
the Marchés page lists schedules, not days. That screen is part of this slice.

## Slice 6 — customer frontend

`CustomerStorefront` DTO through `storefront-view-model.ts`; "Prochain marché" card;
`market-card.ts` lists its day's menu.

## Slice 7 — docs

- `docs/MARKET_MIAM.md` — event catalog: three market-day events became two
- `NEXT_BEHAVIOURS.md` — **currently names deleted commands** (`plan/unplan`); stale as written
- `docs/WEBSITE-PLAN.md:90` — same
- Consider an ADR for the whole-set replace

## Open

| Question | Working assumption |
|---|---|
| `endTime` unset on a schedule day | Fall back to end of calendar day |
| Where the upcoming-days port lives in vendor-frontend | Extend `markets/http.market-schedules.ts`; new feature depends on its facade |
| Does Prochains-marchés repeat the day shown in the top card? | Undecided |
| Top card when nothing is planned | Show it — date and place are useful anyway |
| Dashboard card window | 14 days |
| French copy | App says "Votre vitrine / Votre catalogue / Vos marchés"; "Vos menus" fits |

## Known issues (not blockers)

- **`apps/api` catalogue.spec transport flake**, ~3% per run. Three symptoms across three different
  tests (`ECONNRESET`, `301` from a server that isn't ours, 5s timeout), never an assertion diff.
  Cause: `startApp` leaves the app unbound, so supertest binds/tears down an ephemeral listener per
  request. `app.listen(0)` and `keepAlive:false` were both tried and **neither changed the rate**.
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
