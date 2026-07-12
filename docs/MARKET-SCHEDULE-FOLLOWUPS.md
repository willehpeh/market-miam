# Market Schedule — Follow-ups

Deferred after the schedule slice shipped (register, calendar list, cancel, declare-absence as ranges, amend, upcoming-days read model + `GET /market-schedules/upcoming`, vendor edit path). Ordered by leverage; 1–3 are small, 4–5 are slices.

## 1. Interactive frequency / one-off picker — frontend only, medium

The form's cadence control is static: "Chaque semaine" hardcoded active, "Une seule fois" disabled (`add-schedule.ts`). The **domain, API, cadence engine (Rule A) and read model already support `{weeks:N}` and `'once'`** — the UI is the only thing pinning weekly.

- Make the picker interactive: weekly / every-N-weeks stepper + enable one-off.
- Widen frontend `frequency` type → `{ weeks: number } | 'once'` (`market-schedules.ts`, currently `{weeks:number}`).
- Add a `'once'` case to `cadenceLabel` in `markets-list.ts` ("date ponctuelle").
- Then editing can **change** cadence, not just preserve it.

## 2. Cold direct-nav guard for the edit routes — small, **built**

**Status: built** — `editableDish` / `editableSchedule` `CanActivateFn`s wired `canActivate` on both edit routes.

Was: `AddSchedule` (`:scheduleId/edit`) and `AddDish` (`:itemId/edit`) both reuse the add-form component and resolve `editing` synchronously in a field initializer from an already-loaded store, neither calling `load()`. On direct-nav (bookmark/refresh) the store was empty → the form silently fell back to **add mode** (schedule → `registerSchedule`; dish → `addDish` with a fresh `crypto.randomUUID()`, each creating a NEW entity). List→card flow warmed the store (list constructors load-if-cold), so it only bit on direct nav.

**Guard, not a resolver** — the form reads the store directly, not `route.data`, so a resolver's return value would go unused; the not-found redirect is a one-line `UrlTree`. Each guard mirrors `authenticated`: warm the store only when cold (preserves an optimistic insert), hold the route on `toObservable(loading)` until the load settles, then admit if the target exists else `parseUrl` back to the list. Specs drive it with `RouterTestingHarness` + an async-filling fake; both guards at 100%.

## 3. Enforce `marketId` immutability on amend — small, defense-in-depth

`AmendMarketSchedule` carries `market.id`; the aggregate uses whatever's sent — immutable **by convention** only. A buggy/rogue client could repoint a schedule's market, breaking the market-day stream key (`market-day-${date}-${vendorId}-${marketId}`).

- `Calendar.apply()` tracks `scheduleId → marketId` (new case on `Registered`/`Amended`; amend has no `apply` case today).
- `amendMarketSchedule` rejects a differing id → new `DomainError` → 400.

## 4. Customer/public upcoming view — slice, the read half's payoff

`GET /market-schedules/upcoming` + the occurrence shape (with `absent`) exist but nothing renders them. This is why the read half was built: the public storefront (and vendor dashboard) showing chronological market days with **"Sat 3 Jul — ABSENT"**.

- Current endpoint is JWT-authed/vendor-scoped. Customer side needs a **public (unauthed) variant keyed by subdomain → vendor** — sketched in `docs/CUSTOMER-FRONTEND-PLAN.md`.
- Scope: public endpoint variant + frontend feature. Grill before building.

## 5. Prepared-state overlay — slice, design-heavy, deferred throughout

Occurrences are expanded from the schedule (forward-looking); market-day streams hold **actual** prepared state (`PlanItemsForMarketDay`). "Past = actual events, future = schedule" is not a clean split — a future date can have actual events once prepared, and an amended schedule can orphan an already-prepared day.

- Read model / query that left-joins actual market-day events onto expanded occurrences, surfacing prepared/attended state.
- Needs its own design pass (grill first).
