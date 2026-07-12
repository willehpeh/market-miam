# Add Market Schedule Form — Plan

> **Archived — shipped.** Design record, not a backlog. The form is live at `apps/vendor-frontend/src/app/markets/add-schedule.ts`, routed `markets/new → AddSchedule`, with `market-schedule.{state,effects,facade,http}` + `markets-list.ts`. Extended since with the amend/edit path (`:scheduleId/edit`, `amendSchedule`). See `docs/MARKET-SCHEDULE-FOLLOWUPS.md`.

The form behind "Ajouter un marché" at `/dashboard/markets/new` (currently `ComingSoon`). Weekly recurring only. Dispatches `RegisterMarketSchedule`. **Pure frontend — zero backend changes** (`POST`/`GET /market-schedules` already exist and are acceptance-tested).

Mockups: `docs/design/add-schedule-1.png`, `add-schedule-2.png`. Mirror the built `markets/` slice + `catalogue/add-dish.ts` (form) + catalogue write path (state/effects/store facade). Signal Forms as in add-dish.

## Fields → command

POST body (`/api/market-schedules`, vendorId added server-side):
```
{ scheduleId, startDate, market:{id,name,streetAddress?,codePostal,town,pitch?}, days:[{day,startTime?,endTime?}], frequency:{weeks:1} }
```

| Mockup | Command | Rule |
|---|---|---|
| NOM DU MARCHÉ | `market.name` | required |
| ADRESSE · optionnel | `market.streetAddress?` | optional |
| CODE POSTAL *(add — mockup omits it)* | `market.codePostal` | required, 5 digits |
| VILLE | `market.town` | required |
| JOURS DE LA SEMAINE (multi) | `days[].day` | ≥ 1 selected |
| HORAIRES PAR JOUR | `days[].startTime/endTime` | **optional**; reject end-without-start; end > start when both set |
| EMPLACEMENT · optionnel | `market.pitch?` | optional |
| FRÉQUENCE | `frequency` | `{weeks:1}` (see toggle) |

`market.id`, `scheduleId`, `startDate` are **not** form fields (see Minting).

## Form (hybrid)

- **Signal Forms** (flat) for market text fields: `name` (required), `streetAddress?`, `codePostal` (required, 5-digit, `inputmode="numeric"`), `town` (required), `pitch?`. Mirror `add-dish` error surfacing (touched + invalid → inline hint).
- **`signal<DayEntry[]>`** for days (`{day,startTime,endTime}`) — a toggled set, not a form array. Chips `L M M J V S D` → `MON..SUN` (order Mon-first; two "M" = Mardi/Mercredi). Selecting a chip pushes `{day,'08:00','13:00'}`; `×`/deselect removes. Native `<input type="time">` binds `startTime`/`endTime` (value is `HH:MM` = command shape; clearable → optional).
- **FRÉQUENCE toggle**: "Chaque semaine" selected; "Une seule fois" **disabled** (greyed, non-selectable) + weekly helper text. `frequency` hardcoded `{weeks:1}`. One-off deferred (not in domain — absent frequency defaults to weekly; needs a date-picker form).

Submit disabled until: name + town non-empty, codePostal 5-digit, ≥1 day, every row valid (no end-only; end > start when both set).

## Minting & write flow

- Component passes **content** to the facade: `NewSchedule = { market:{name,streetAddress?,codePostal,town,pitch?}, days, frequency:{weeks:1} }`. Component does **not** mint (add-dish mints in-component only because photo upload needs the id early — N/A here).
- `StoreMarketScheduleFacade.registerSchedule(content)` mints `market.id` + `scheduleId` (`crypto.randomUUID()`), stamps `startDate` = **local** today (`YYYY-MM-DD`, not UTC slice), builds the body, dispatches `RegisterMarketSchedule(body)`.
- `register$` effect → `MarketSchedules.register(body)` (`POST`) → `RegisterMarketScheduleSuccess({schedule: body})`; `navigateOnRegistered$` (dispatch:false) → `/dashboard/markets`.
- **Errors**: global `errorInterceptor` toasts `status 0 || ≥500`; 4xx unreachable behind client validation, so `RegisterMarketScheduleFailure` stays unreduced (like `AddDishFailure`). No dedicated error UX.

## Optimistic insert

- `RegisterMarketScheduleSuccess` reducer **appends** `schedule` to `schedules` — the list shows it immediately.
- `MarketsList` must **load only when the store is empty** — else its `load()`-on-init re-`GET`s and clobbers the optimistic row while the projection lags (`EVENT_NOTIFICATIONS` is `EMPTY`, poll-timer only; no LISTEN/NOTIFY yet).
- Note: catalogue should adopt the same optimistic insert (currently reload-only).

## Build order (outside-in, facade seam, one RED→GREEN each, review gate)

1. **Component spec** (`add-schedule.spec.ts`, fake facade, `@testing-library/angular` as add-dish): renders fields + day chips ⇄ time rows, validation gating, disabled one-off, submit assembles content → `facade.registerSchedule(content)`. Drives `AddSchedule` + abstract `registerSchedule` + `FakeMarketScheduleFacade` (records content).
2. **Store spec** (`market-schedule.spec.ts`, fake HTTP, mirror `catalogue.spec.ts` add cases): `registerSchedule(content)` → mints ids + today → `POST /api/market-schedules` (assert body via `expect.objectContaining` + `scheduleId/market.id: expect.any(String)`) → success optimistic-inserts + navigates; error path. Drives state/effects/`register` port/store facade.
3. **Wire**: `app.routes.ts` `markets/new` → `AddSchedule` (replace `ComingSoon`); guard `MarketsList` load-when-empty (+ update its spec).

## Files

Create: `markets/add-schedule.ts`, `markets/add-schedule.spec.ts`.
Edit: `market-schedules.ts` (+`register`), `market-schedule.facade.ts` (+`registerSchedule`, `NewSchedule`), `market-schedule.state.ts` (Register actions + optimistic reducer), `market-schedule.effects.ts` (`register$`, `navigateOnRegistered$`), `store.market-schedule.facade.ts`, `http.market-schedules.ts`, `fake.market-schedule.facade.ts`, `market-schedule.spec.ts`, `markets-list.ts` (+ spec), `app.routes.ts`.

## Gotchas

- Vitest strips types — typecheck `apps/vendor-frontend/tsconfig.app.json` + `tsconfig.spec.json`.
- Adding a dep to a routed component breaks specs that render it via routing — provide the fake (cf. `dashboard`/`authenticated.guard`/`onboarding.launch` when `MarketScheduleFacade` landed).
- Zero backend changes; don't touch the domain/read model.
