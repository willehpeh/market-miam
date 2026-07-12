# Market Schedule — Registration & Remaining Work

`RegisterMarketSchedule` now carries a full **market object** instead of a bare `marketId`. Built outside-in TDD, one behaviour per RED→GREEN. Package: `packages/market-days`. Tests: `test/src/market-days/register-market-schedule/`.

## Shape

Command / event `market`:

| field | VO | rule |
|-------|-----|------|
| `id` | `MarketId` (shared-kernel) | non-empty, edge-minted (ADR 0024 convention) |
| `name` | `MarketName` | non-empty (trim → `EmptyValueError`) |
| `streetAddress?` | `StreetAddress` | **optional**, free text, no validation |
| `codePostal` | `PostalCode` | `/^\d{5}$/` after trim → `InvalidPostalCodeError` |
| `town` | `Town` | non-empty |
| `pitch?` | `Pitch` | **optional** (= "emplacement"), free text, no validation |

`MarketScheduleRegistered.payload.market` nests all of the above (optional fields omitted when absent); schedule fields (`scheduleId`, `startDate`, `days`, `frequency`) unchanged. `scheduleName` dropped — no consumer (read model surfaces `market.name`); re-add if a UI ever lists schedules by a vendor-chosen label. Multiple recurrences per market per vendor are allowed, so `scheduleId` stays as the addressable retraction handle.

VOs in `packages/market-days/src/market/`. `Market` is a composed VO mirroring `Schedule`, with `snapshot()`. Handler builds it in `register-market-schedule.handler.ts` (`marketFrom`); `Calendar.registerMarketSchedule(market, schedule)` snapshots it into the event.

## Done

Behaviours 1–7, all committed, 100% stmts+branches on every touched file:

1. Register with full market → nested event payload
2. Pitch omitted → snapshot omits it
3. Reject empty name
4. Street address optional
5. Reject empty town
6. Reject empty id (guarded by `MarketId` already; test locks it)
7. Reject malformed `codePostal` + trim valid

Commits: `17fe8a1` (1) · `7de18ff` (2–5) · `3e5e451` (6–7). Spec: 32 tests. Full `test` project: 296 pass.

## Decisions (don't re-litigate)

- **`id` stays**, edge-minted & passed in — it's the market-day stream key `market-day-${date}-${vendorId}-${marketId}`. Not generated in the handler (would break ADR 0024 and force an id-generator port).
- **`pitch` lives on the market object**, not a schedule sibling — everything here is vendor-scoped, so the shared-vs-vendor distinction is invisible. Move it if a shared-market registry ever lands.
- **`codePostal` = 5 digits, no Corsica exception.** French *postal codes* are always 5 digits incl. Corsica (`20xxx`). `2A`/`2B` are *department* codes (a different identifier), not captured. No department-range validation (lookup table, buys nothing at this boundary).
- **`streetAddress`/`pitch` optional = no validation** (like each other). Empty string → treated as absent by the handler's truthiness guard.

## Next / not done

- ~~**No HTTP controller** dispatches `RegisterMarketSchedule`.~~ **Done** — `POST /market-schedules` (`market-schedule.controller.ts`), JWT-auth'd, vendorId from `@CurrentVendor()`. Spec `market-schedule.spec.ts`: 201 + two 400s. No read-back (no query side yet); add GET when the read model lands.
- **Upcoming market days slice** — design resolved below. Two halves: a **write half** (add cancel + declare-absence so the view can retract — without them it asserts future attendance it can never correct) and a **read half** (forward-looking read model). Reframed away from "schedule→market-day materialisation": no processor, no eager MarketDay events; market-days stay lazily born on `PlanItemsForMarketDay`. Past market days come from actual events, not the schedule.
- **Separate later slices:** prepared-state overlay (join market-day events), past view (from actual events), pick-to-prepare HTTP endpoint (`PlanItemsForMarketDay` isn't exposed over HTTP yet).

## Rejected: eager MarketDay materialisation

Considered: on `Register`, eagerly emit the next 7–14 days of MarketDays; a nightly cron rolls the horizon to D+14. **Rejected.**

- **Buys planning nothing.** `PlanItemsForMarketDayHandler` loads the stream and rehydrates from `[]` for an untouched day — `planItems` runs on a fresh aggregate. A pre-existing `MarketDayScheduled` event changes zero lines in the handler or aggregate; birth is already transparent. There is no planning code that a materialised day simplifies.
- **Costs a lot.** A new `MarketDayScheduled` event (the aggregate has no "opened" event — birth is implicit), a processor fanning `Register` out to N streams, a cron owning idempotency + missed-night catch-up, and — the killer — **reconciliation**: cancel/skip/re-register must retract or recompute already-materialised days. Eager materialisation duplicates the schedule as write-side state every mutation must resync.
- **Query-time expansion has none of that.** One source of truth (the schedule), `[today, today+56]` derived fresh per read; cancel/skip just change the next expansion. No cron, no processor, no drift.
- **Flip condition:** a MarketDay needing state *before* the vendor touches it — customer pre-orders, day-attached reminders. Not in scope; the stream id is deterministic, so a future day is addressable without materialising. Even the prepared-state overlay left-joins *actual* events onto expanded occurrences — it doesn't want eager days.

## Calendar list (Calendrier) — schedules read model (resolved, **built**)

**Status: built** — all steps below shipped (pg adapter is `PostgresMarketScheduleViews`); build order kept for reference.

**Distinct from "Upcoming market days" below.** This projects schedules **as-registered** (weekday + times + cadence) — no date expansion, no `Clock`. The mockup (`docs/design/calendar.png`) shows recurring schedules by weekday, never dates (the "PROCHAINE DATE DANS 2 J" header is out of scope). The occurrence model below (flat dated occurrences) is a separate, later read model; the two can coexist.

Decisions:

- **List first**; add form is a later slice. "Ajouter un marché" card → `ComingSoon` at `/dashboard/markets/new` (interim), reroute when the form lands. Replaces the current `ComingSoon` at `/dashboard/markets` (onboarding step 3).
- **Persisted** read model mirroring `CatalogueViews`: in-mem + pg adapters, ISP read/write surfaces, projection + query handler, subscription. Chosen over on-demand fold — it's the resolved read-half infra and the customer/public frontend reads it later.
- **Row = full schedule snapshot**: `{ scheduleId, market{id,name,streetAddress?,codePostal,town,pitch?}, startDate, days[], frequency }`. Keyed `(vendorId, scheduleId)`; re-register **upserts**. One card per schedule — no market-level merge (two cadences at one market = two cards).
- **Projection** consumes `MarketScheduleRegistered` only (cancel/skip don't exist yet). Ordering: as stored.
- **Recurring only.** Per-card cadence label: `1 → chaque semaine`, `N → toutes les N semaines`. One-off ("date ponctuelle") deferred — not in the domain (absent frequency defaults to weekly) and needs a dated card, not a weekday card.
- **Empty state** = only the add card + "Continuer" (mirrors `catalogue-list`); no dedicated empty component.
- **Frontend** mirrors the catalogue slice; suites split at the facade seam (component↔fake-facade; facade↔http via `HttpTestingController`).

Build order — outside-in social TDD, one RED→GREEN per step, review gate each ([[feedback_incremental_steps_review_gates]]):

1. `apps/api` acceptance (RED first): seed via `POST /market-schedules`, then `GET /api/market-schedules` returns it. Red until 2–3 land.
2. Query + in-mem read model — social spec (mirror `find-vendor-catalogue`): empty → `{ schedules: [] }`; seed via write surface (`recordSchedule`, upsert); vendor-scoped. Drives `FindVendorSchedules` + handler, `InMemoryMarketScheduleViews`, the DTO.
3. Projection — `MarketScheduleRegistered` → row via write surface. Drives `MarketScheduleViewProjection` + subscription registration (greens step 1).
4. Contract spec + `PgMarketScheduleViews` — list survives reload.
5. Component spec (fake facade): `MarketsList` — card per schedule (French weekday + time labels, sorted Mon→Sun), cadence label, empty → add card only, `load()` in constructor. Drives component + abstract `MarketScheduleFacade` + fake.
6. Store spec (fake HTTP, mirror `catalogue.spec.ts`): `load()` → `GET /api/market-schedules`, loading flag, schedules on flush, error → empty. Drives `StoreMarketScheduleFacade` + state + effects + `HttpMarketSchedules` port + providers.

Naming: query `FindVendorSchedules` → `{ schedules: [] }`; endpoint `GET /api/market-schedules`.

## Upcoming market days — design (resolved)

*Separate read model from the Calendar list above — dated occurrences, not as-registered schedules.* Vendor-scoped read model; both frontends read it (customer public, vendor authed — HTTP concern, not data).

### Write half — schedules can now be retracted

Cancel and declare-absence pulled forward: an upcoming view with no way to retract shows attendance that may be false forever (schedules have no end date). `Register` already shipped; add two commands, **one event each** ([[feedback_single_event_per_command]]), both on the Calendar stream:

| Command | Event | Effect |
|---------|-------|--------|
| `CancelMarketSchedule(scheduleId)` | `MarketScheduleCancelled` | Whole schedule gone; all future occurrences vanish. |
| `DeclareAbsence(scheduleId, date)` | `AbsenceDeclared` | Vendor absent from that occurrence; schedule keeps recurring. |

- **`Calendar.apply()` is no longer a no-op** (reverses the earlier note). Aggregate tracks active schedules + per-schedule declared absences; rehydrates from events (`MarketDay` pattern). Enforces: can't cancel or declare absence on an unknown schedule, can't declare absence on a non-occurrence, can't declare the same absence twice — all `DomainError` → 400 ([[project_domain_error_to_400]]).
- **Occurrence logic lives on the `Schedule` VO** (`occursOn(date)`, `occurrencesWithin(from, to)`), shared by the aggregate (absence validation) and the read model (expansion) — no duplicated cadence math.
- HTTP: `DELETE /market-schedules/:scheduleId` (cancel), `POST /market-schedules/:scheduleId/absences` (declare absence; date in body). Declaring an absence *creates* state, so POST — not a DELETE on a computed occurrence.
- *Named `DeclareAbsence`/`AbsenceDeclared` — vendor intent (a trader declaring an absence to the placier), and sidesteps the `MarketDay` aggregate-name collision. Aggregate state: per-schedule declared absences.*

### Read half — the read model

| Branch | Decision |
|--------|----------|
| Source | Persisted read model mirroring `CatalogueViews` — in-mem + pg adapters, ISP-split read/write surfaces, projection + query handler, subscription registration. |
| Projection | Keyed by `(vendorId, scheduleId)`. `Registered` upserts (re-register replaces); `Cancelled` deletes the row; `AbsenceDeclared` appends to `absences`. |
| Query | `FindUpcomingMarketDays(vendorId)`; `Clock` supplies `today`; expand each record via `Schedule.occurrencesWithin`, subtract `absences`; union; sort ascending. |
| Expansion | Window `[today, today+56]`. Cadence anchored at `startDate`'s week: emit `days[]` where `weeksSinceStart % weeks == 0`, dates `>= startDate`. Absent frequency = one-off (a real requirement): occurs only in `startDate`'s week. |
| Shape | Flat chronological occurrences: `{ scheduleId, marketId, date, startTime?, endTime?, market: {name, town, codePostal, streetAddress?, pitch?} }`. No dedup on collision. |
| Boundary | `date >= today` inclusive. Past scheduled dates drop out. NB "past = actual events" is not a pure temporal split — a **future** date can also have actual events once prepared; the overlay slice reconciles them. |

Notes: `HORIZON_DAYS = 56` is a tunable constant. Event payload types `frequency` as required but one-off is real, so make it `frequency?` (command already is). Define `weeksSinceStart` precisely before coding (per-calendar-week bucket from `startOfWeek(startDate)`) — off-by-one-week trap. Follows `FindVendorCatalogue` / `CatalogueViewProjection` patterns.

- A MarketDay needs only `(vendorId, marketId, date)` — no market name/address/times. Descriptive fields live in the read model above, where the nested `market` object copies through cohesively.

## Gotchas

- **vitest strips types without checking** — "optional field" changes go green at runtime regardless; the real RED is the build. Verify with `npx tsc --noEmit -p packages/market-days/tsconfig.lib.json` (and `test/tsconfig.spec.json`).
- Coverage text reporter hides 100% files; use `--coverage.reporter=json-summary` + read `coverage/test/coverage-summary.json` for per-file numbers.
- `InvalidPostalCodeError` exported from the package barrel (`src/index.ts`); market VOs are **not** (internal surface only, mirrors schedule VOs).
