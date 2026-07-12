# Market Schedule — Follow-ups

Deferred after the schedule slice shipped (register, calendar list, cancel, declare-absence as ranges, amend, upcoming-days read model + `GET /market-schedules/upcoming`, vendor edit path). Ordered by leverage; 1–3 are small, 4–5 are slices.

## 1. Interactive frequency / one-off picker — frontend only, medium

The form's cadence control is static: "Chaque semaine" hardcoded active, "Une seule fois" disabled (`add-schedule.ts`). The **domain, API, cadence engine (Rule A) and read model already support `{weeks:N}` and `'once'`** — the UI is the only thing pinning weekly.

- Make the picker interactive: weekly / every-N-weeks stepper + enable one-off.
- Widen frontend `frequency` type → `{ weeks: number } | 'once'` (`market-schedules.ts`, currently `{weeks:number}`).
- Add a `'once'` case to `cadenceLabel` in `markets-list.ts` ("date ponctuelle").
- Then editing can **change** cadence, not just preserve it.

## 2. Cold direct-nav resolver for the edit route — small

`/dashboard/markets/:scheduleId/edit` reached directly (bookmark/refresh) finds an empty store → the form silently falls back to **add mode** (a save registers a new schedule). Normal list→card flow warms the store, so this only bites on direct nav.

- Route `resolve` on the edit route: dispatch `load`, wait until the store is populated before the component activates (Signal Forms init synchronously → store must be warm at construction).
- If the schedule still isn't found post-load, redirect to the list.

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
