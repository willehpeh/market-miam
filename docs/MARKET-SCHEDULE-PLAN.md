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

`MarketScheduleRegistered.payload.market` nests all of the above (optional fields omitted when absent); schedule fields (`scheduleId`, `scheduleName`, `startDate`, `days`, `frequency`) unchanged.

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
- **Upcoming market days read model** — next slice, design resolved below. (Reframed: not "schedule→market-day materialisation." No processor, no eager MarketDay events; market-days stay lazily born on `PlanItemsForMarketDay`. The schedule feeds a forward-looking read model; past market days come from actual events, not the schedule.)
- **Separate later slices:** prepared-state overlay (join market-day events), past view (from actual events), pick-to-prepare HTTP endpoint (`PlanItemsForMarketDay` isn't exposed over HTTP yet).

## Upcoming market days — design (resolved)

Vendor-scoped read model; both frontends read it (customer public, vendor authed — HTTP concern, not data).

| Branch | Decision |
|--------|----------|
| Scope | Upcoming read model only. Overlay / past view / pick-to-prepare are separate slices. |
| Source | Persisted read model mirroring `CatalogueViews` — in-mem + pg adapters, ISP-split read/write surfaces, projection + query handler, subscription registration. |
| Projection | Consumes `MarketScheduleRegistered`; upsert by `(vendorId, scheduleId)`; re-register replaces. |
| Query | `FindUpcomingMarketDays(vendorId)`; `Clock` supplies `today`; expand each record at query time; union; sort ascending. |
| Expansion | Window `[today, today+56]`. Cadence anchored at `startDate`'s week: emit `days[]` where `weeksSinceStart % weeks == 0`, dates `>= startDate`. Absent frequency = one-off (startDate's week only). |
| Shape | Flat chronological occurrences: `{ scheduleId, marketId, date, startTime?, endTime?, market: {name, town, codePostal, streetAddress?, pitch?} }`. No dedup on collision. |
| Boundary | `date >= today` inclusive. Past scheduled dates drop out (past = actual events). |

Notes: `HORIZON_DAYS = 56` is a tunable constant. `Calendar.apply()` stays a no-op for this slice. Event payload types `frequency` as required but it can be absent — the expander handles it; fix the type to `frequency?` while there. Follows `FindVendorCatalogue` / `CatalogueViewProjection` patterns.

- A MarketDay needs only `(vendorId, marketId, date)` — no market name/address/times. Descriptive fields live in the read model above, where the nested `market` object copies through cohesively.

## Gotchas

- **vitest strips types without checking** — "optional field" changes go green at runtime regardless; the real RED is the build. Verify with `npx tsc --noEmit -p packages/market-days/tsconfig.lib.json` (and `test/tsconfig.spec.json`).
- Coverage text reporter hides 100% files; use `--coverage.reporter=json-summary` + read `coverage/test/coverage-summary.json` for per-file numbers.
- `InvalidPostalCodeError` exported from the package barrel (`src/index.ts`); market VOs are **not** (internal surface only, mirrors schedule VOs).
