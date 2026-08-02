# OO smell audit

Source: fan-out review (9 regions, one finder each) + per-finding adversarial verify. 22 raised → **12 confirmed**; 10 rejected as intentional (VO `value()`, deliberate constructor work, ponytail shortcuts, single-interface ports). `md-readmodels` and `customer-frontend` clean.

Ranked by severity. #1 (the `Pricing` VO), #5 (the ADR 0035 refactor) and #6
(`withSpan`) have since been fixed; the rest are open (verified against the code
2026-08-02).

## Themes

- **Duplicated knowledge that should be one object** — #1, #3, #6, #7 (and the tracing/append-transaction boilerplate).
- **Decisions leaking out of the object that owns the state** — #2, #4, #9.

## High

### 1. Price-XOR-variants logic scattered across `Catalogue` — **Fixed**
`packages/market-days/src/catalogue/catalogue.ts`

The "priced XOR variants" concept — invariant, event serialization, rehydration — was spread across ~4 spots: `assertPricedXorVariants`, both event-build ternaries, both `apply()` ternaries, and the paired `price?`/`variants?` params on **both** `Catalogue` and `Item`.

**Fixed as suggested:** the `Pricing` value object (`catalogue/item/pricing.ts`) holds price XOR variants, validates the invariant in its constructor, and `Catalogue.apply`/`Item.revise` take it directly (`Pricing.from(event.payload)`).

## Medium

| # | Location | Smell | Issue | Fix |
|---|---|---|---|---|
| 2 | `catalogue/item/item.ts:44` | identity by field-poking | `hasId` compares raw `value()`, bypassing the VO's own equality | `return this._itemId.equals(itemId);` |
| 3 | `amend-market-schedule/amend-market-schedule.handler.ts:26` | duplicated construction | `marketFrom`/`scheduleFrom` byte-identical to `register-market-schedule.handler.ts:29-48`; the two Command classes also duplicate `MarketDetails` + every field | `Market.fromPrimitives(details)` / `Schedule.fromPrimitives(...)` static factories; share the `MarketDetails` type |
| 4 | `storefront/storefront.ts` | feature-envy | readiness predicates (`hasTitle`/`hasCoverPhoto` since ADR 0043 dropped description) exist only so `StorefrontPublication` can branch on internal state; `publish()` raises `StorefrontPublished` with no readiness invariant of its own, so a direct call bypasses the check | one `missingForPublication(): string[]` behaviour method; `StorefrontPublication` concatenates it into `missing[]` |
| 5 | `event-sourcing/src/adapters/postgres/append-transaction.ts:6` | temporal coupling | 5 public methods must be called in one exact order; the ordering leaks into `PostgresEventStore` | **Fixed** (ADR 0035): now `SerializedAppend.execute(events, expected, metadata)`, run through `PostgresUnitOfWork.inTransaction(fn)` — lifecycle owned by the UoW, protocol owned by the append |
| 6 | `apps/api/src/app/event-sourcing/tracing/command-gateway.ts:16` | duplicated conditional | identical span try/catch/finally (`exception.slug` + `recordException` + `setStatus(ERROR)` + `span.end`) copy-pasted across 6 methods in 5 files (`command-gateway.ts:16`, `query-gateway.ts:13`, `event-handler.ts:15`, `subscription.ts:20`, `event-store.ts:22` & `:44`) | **Fixed**: `withSpan(span, slug, work)` in `tracing/with-span.ts`; call sites keep `startActiveSpan` + attributes. `event-store load` failures are now recorded too (`event-store-load-failed`) — they previously ended the span silently |
| 7 | `apps/vendor-frontend/src/app/markets/markets-list.ts:7` | duplicated domain knowledge | weekday code→label table (order + French label) encoded in two components; can silently drift | one shared `DAYS` const (code, short, label, order); `markets-list` and `add-schedule` both derive from it |

## Low

| # | Location | Smell | Issue | Fix |
|---|---|---|---|---|
| 8 | `calendar/schedule/schedule-day.ts:18` | redundant state | `_startTime` held twice (also inside `_window`'s `TimeRange`); `value()` needs a 3-way branch; the `window.start == _startTime` invariant is implicit | make `TimeRange.end` optional; store only `_window`; `return { day, ...(_window?.value() ?? {}) }` |
| 9 | `event-sourcing/src/adapters/polling.subscription.ts:30` | feature-envy (tell-don't-ask) | subscription pulls `eventTypes()` to decide dispatch; the guard only exists because `handle()` throws on an unmapped type | `handle()` no-ops on unmapped types (`this.map()[event.type]?.(event) ?? Promise.resolve()`); call `handle(event)` unconditionally; drop `eventTypes()` from `EventHandler`/`ProjectionFor` |
| 10 | `common/src/instant.ts:7` | misplaced concept | generic point-in-time VO names its field/param `_registeredAt`, baking one caller's use (vendor registration) into a shared-common VO | rename `registeredAt`/`_registeredAt` → `value`/`_value` |
| 11 | `common/src/phone-number.ts:5` | anemic value object | unlike every sibling VO (`Email`, `Url`, `LocalDate`, …) enforces no invariant — trims and silently accepts `''`/garbage | throw `EmptyValueError` when empty after trim (add a shape check if a phone format is defined) |
| 12 | `apps/api/src/app/market-days/storefront.controller.ts:66` | misplaced knowledge | Cloudinary public-ID layout + `v{version}/{publicId}` reference format hand-built in the request handlers; two encodings of one scheme split across the controller and `SignedUploads` | move builders onto `SignedUploads` (`forCoverPhoto(vendorId)`, `coverPhotoReference(vendorId, version)`) |
