# Vendor frontend — deferred refactors

§1–2 settled while designing slice 5 of `MENU-DU-JOUR-PLAN.md`: both apply to shipped features and
are deliberately **not** part of that slice — the menu screens are greenfield and prove the pattern
for free, converting the others is its own change. §3 came out of the post-slice design review and
waits on a feature rather than a refactor window.

## 1. ~~Route-id screens: drop the guards, load reactively~~ — done

Both screens derive their record and branch in the template, exactly as the menu editor does, and
`editable-item.guard.ts` / `editable-schedule.guard.ts` are gone with their specs. Three notes on
how it actually went:

**The create-vs-edit branch keys off the route, not the store.** The hazard named below was real and
could not be fixed by making the read reactive alone: an id minted at field init picks create-mode
before the record arrives. A link that names a record is an edit even before the record is there, so
`isEditing` reads the route param and the minted id is only ever used by the create screen.

**The Signal Form reseeding hazard is handled by a `linkedSignal` guarded on record identity.** Not
by `touched() ?? derived` — a form model is reseeded wholesale rather than merged. The trap: a
`linkedSignal` recomputes whenever its *source's dependencies* change and does not compare source
values, so an unguarded one reseeds on every store write. Comparing against `previous.source` inside
the computation is what makes it identity-keyed. The test that failed first was a photo upload
landing mid-edit and retyping the form.

**The guard specs were re-homed, not deleted.** "warms a cold store so a direct-nav edit prefills"
became "prefills once the dish arrives"; "bounces when the item is unknown" became "says so when the
dish is no longer on the carte" — deliberately a different behaviour, since the screen states it
rather than redirecting. "does not reload a warm store" was already the facade's, kept by §2.

The original note follows.

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

~~Blocked on: slice 5 shipping.~~

## 2. ~~Warm-only loading belongs in the facade~~ — done

Shipped during live-mode slice 1: `StoreCatalogueFacade` and `StoreMarketScheduleFacade` own
freshness behind a `fresh` flag like market-days, the call-site guards and their `ponytail:`
comments are gone, and the dashboard's unconditional loads became warm-only with no dashboard
edit — closing the latent clobber bug named below. Two revisions to the design as written:
**fresh is set on success only**, so a failed load retries on the next screen visit
(market-days changed to match — its failure path used to mark the cache fresh); and the
optimistic **append successes** (`AddItemSuccess`, `RegisterMarketScheduleSuccess`) mark fresh
too, because the add screens are deep-linkable, so an append can land on a cold store and a
follow-up GET could only clobber it.

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
