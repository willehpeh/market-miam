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

- **No HTTP controller** dispatches `RegisterMarketSchedule` (was already true before this work). Only registered in `apps/api/src/app/market-days/market-days.module.ts`.
- **No schedule→market-day materialisation.** Two open decisions, orthogonal to the event shape (event already carries everything either needs):
  1. **Eager processor vs lazy on-demand.** Today market-days are born lazily — `MarketDays.forVendorAtMarket(...).on(date)` load-or-creates on the first command (`market-day/market-days.ts`). A schedule→market-day processor is a choice, not a requirement; the schedule can just feed a read model of valid dates.
  2. **Recurrence horizon.** Weekly/monthly schedules imply unbounded days; whoever expands (`startDate` + `days[].day` + `frequency.weeks`) needs a cutoff.
- A MarketDay needs only `(vendorId, marketId, date)` — it carries no market name/address/times. The descriptive fields are for a read model ("your upcoming market days"), where the nested `market` object copies through cohesively.

## Gotchas

- **vitest strips types without checking** — "optional field" changes go green at runtime regardless; the real RED is the build. Verify with `npx tsc --noEmit -p packages/market-days/tsconfig.lib.json` (and `test/tsconfig.spec.json`).
- Coverage text reporter hides 100% files; use `--coverage.reporter=json-summary` + read `coverage/test/coverage-summary.json` for per-file numbers.
- `InvalidPostalCodeError` exported from the package barrel (`src/index.ts`); market VOs are **not** (internal surface only, mirrors schedule VOs).
