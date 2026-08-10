# Vendor frontend — deferred refactors

§1–2 settled while designing slice 5 of `MENU-DU-JOUR-PLAN.md`: both apply to shipped features and
are deliberately **not** part of that slice — the menu screens are greenfield and prove the pattern
for free, converting the others is its own change. §3 came out of the post-slice design review and
waits on a feature rather than a refactor window.

## 1. Route-id screens: drop the guards, load reactively

`editableDish` and `editableSchedule` exist because their components read the entity **synchronously
at field init** (`add-schedule.ts:172`, `add-dish.ts:322`), so a cold direct-nav would render an
empty form and save it — wiping the record. The guard warms the store and holds the route until the
load settles.

The menu editor instead derives reactively and branches in the template:

| State | Renders |
|---|---|
| `loading()` | spinner |
| entity found | the editor |
| loaded, absent | "n'est plus programmé" + link back |

Save only exists inside the found branch, so the wipe is structurally impossible — no routing
involved. Selection seeds via `touched() ?? derived-from-store`, so a store update cannot clobber
in-progress edits.

To convert:

- Delete `editable-dish.guard.ts`, `editable-schedule.guard.ts` and their specs (67 + 68 lines)
- Replace synchronous `editing` reads with `computed()`
- **Hazard**: `add-dish.ts:326` is `this.editing?.itemId ?? crypto.randomUUID()`. On async arrival
  it mints a UUID and picks create-mode *before* the dish lands, then the dish arrives. The
  create-vs-edit branch keys off presence and must be reworked, not just made reactive
- **Hazard**: `form(this.model, …)` takes its model at construction (`add-dish.ts:344`,
  `add-schedule.ts:182`). Reseeding a Signal Form the vendor may already be typing into is the
  clobber problem again, now on validated fields

Blocked on: slice 5 shipping.

## 2. Warm-only loading belongs in the facade

`if (!x().length) facade.load()` is duplicated in components (`catalogue-list.ts:99`,
`markets-list.ts:85`), each with its own `ponytail:` comment explaining the same thing. It exists to
stop a re-GET clobbering an optimistic insert while the projection lags 4–275ms.

Move the check into `StoreCatalogueFacade.load()` / `StoreMarketScheduleFacade.load()` — "am I
already warm?" is the facade's question, not each caller's.

Fixes a latent bug: `dashboard.ts:218-219` calls `catalogue.load()` and `markets.load()`
**unconditionally** on every dashboard visit. Today the projection has usually caught up by then;
any flow that saves and returns straight to the dashboard would show stale data.

`length` is a poor cache key where empty is a real answer — market days use an explicit `loaded`
flag for that reason. Catalogue and schedules can keep `length` (a published vendor has both) or
adopt the flag for consistency.

Blocked on: nothing technical. Kept out of slice 5 to avoid touching two shipped features mid-slice.

## 3. Menu editor: reactive params before a second link

`menu-editor.ts` reads its route params from the **snapshot** and keys the vendor's tick state
(`touched`) to nothing. Angular reuses a component instance on a param-only navigation, so the day
an editor→editor link exists, navigating from day A to day B keeps A's component alive with stale
params — and A's ticks silently become B's saved menu. Today this is unreachable: the dashboard
card is the only way in and it links to one day.

The fix, when it arms:

- `params = toSignal(route.paramMap, { initialValue: route.snapshot.paramMap })`, with
  `marketId` / `date` as `computed()` — everything downstream already derives
- `touched` becomes a `linkedSignal` with `params` as its source, so a param change resets it to
  `null` and `selected` falls back to the new day's `itemIds`. Resetting is the half that matters;
  reactive params alone would carry A's ticks into B
- The natural test arrives with the feature: navigate day A → day B in a router harness, assert
  B's menu renders and A's ticks did not bleed. Written today it would exercise a path no user can
  reach, which is why this waits

Armed by: any second link to `/dashboard/menus/:marketId/:date` — the deferred "plan later in
time" day list is the expected trigger (decision 7 narrowed the card to one day; the 56-day window
the store already holds makes the list cheap).
