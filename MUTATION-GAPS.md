# Mutation Gaps

Stryker (`npx nx run test:mutation`), mutating `packages/**/src`, error files excluded (`stryker.conf.mjs`).
665 mutants · 607 killed · 53 survived · 91.28%.

Each survivor = behaviour no test pins. Notation: `file:line:col [Mutator]`, `original → mutated`.

## C. Stream IDs unpinned
vendorId metadata now pinned in `vendor-scoped-events.ts` (killed by the per-use-case `stamps the vendor id` tests).

| Mutant | Change | Gap |
|---|---|---|
| `calendars.ts:18:43`/`19:12`, `vendors.ts:18:43`/`19:12` Block/String | `calendar-${id}`/`vendor-${id}` → empty | Stream-id format unpinned (symmetric load/save; only calendar+vendor streams). |
| `vendor-id-from.ts:4:20` OptionalChaining | `metadata?.['vendorId']` → `metadata['vendorId']` | Event missing metadata untested (defensive). |

## D. Event-store internals & defensive copies

| Mutant | Change | Gap |
|---|---|---|
| `in-memory.event-store.ts:27:20` Method | `seedWith` filter → all events | Multi-stream seed isolation untested. |
| `in-memory.event-store.ts:27:44` ArrowFn | predicate → `() => undefined` | Same path, empty result uncaught. |
| `aggregate.ts:12:12` Method | `_raisedEvents.slice()` → `_raisedEvents` | `raisedEvents()` copy not proven (caller can mutate internals). |
| `in-memory.event-store.ts:9:41` ArrayDecl | `seededEvents = []` → `[…]` | Near-equivalent (initial emptiness not observable). |
| `in-memory.event-store.ts:15:39` String | concurrency message → `` | Message text only. |

## E. Checkpoint processor metadata
`checkpointed.decorator.ts`. Registered checkpoint metadata unasserted.

| Mutant | Change | Gap |
|---|---|---|
| `:18:79`, `:19:22` Block | `CheckpointedProcessor` body/arrow emptied | Processor registration unasserted. |
| `:20:29` ObjectLiteral | `{name, kind:'processor'}` → `{}` | name+kind unchecked. |
| `:20:59`, `:14:59` String | `kind:'processor'`/`'projection'` → `""` | kind discriminator unpinned. |

## F. Market-day reducer & equality — resolved
All Section F survivors are killed (`market-day.ts` and `item-id.ts` now 100%):
- Sold-out `apply` now records `_soldOut` and `markItemAsSoldOut` rejects re-marking with `ItemAlreadySoldOutError` (kills `29:7`/`29:12`; the not-planned check ordered first makes the fallthrough observable).
- `unplanItem` no-ops on an item that isn't planned; the multi-item *"leave other planned items intact"* test pins the unplan filter (kills `32:42`) and, via the filter's use of `equals`, `ItemId.equals` with two different ids (kills `item-id.ts:19:12`).

## G. Branches never exercised — resolved
On inspection only one survivor was a real gap; the rest are equivalent (moved to I).
- `plan-items-for-market-day.handler.ts:35:24` Conditional (`quantity === undefined ? …` → `false ? …`) — **killed.** `new Quantity(undefined)` doesn't throw (`undefined <= 0` is false) and `PlannedItem.value()` then emits `quantity: undefined`, which `toEqual`/`objectContaining` ignore. Pinned by asserting the quantity-less item `not.toHaveProperty('quantity')` (key-presence sensitive).
- `auth0-token-verifier.ts:39:12` Conditional (non-string claim fallback) — **removed.** The `typeof … ? … : ''` guard duplicated validation the `VendorId`/`Email` constructors already own (both reject `''`), so every bad claim funnelled to `InvalidTokenError` either way — equivalent. Simplified `claim` to `payload[name] as string`, deleting the branch.

## H. LocalDate.today() formatting — resolved
The wall-clock read was an impurity on the `LocalDate` value object. Moved the date
formatting into the `DateClock` adapter (the `Clock` port's reference impl) and deleted
`LocalDate.today()`, leaving `LocalDate` pure (symmetric with `Instant`, which has no
static `now()`). The mutants relocated to `date-clock.ts` and are now killed by
`date-clock.spec.ts` asserting `today()` against a fixed system clock (`vi.setSystemTime`)
on a single-digit month/day, plus a local-vs-UTC date that pins "market day = vendor
local time". Test timezone is pinned to `America/New_York` in `test/vitest.config.mts`
(set in the parent process so it holds under both vitest and Stryker) so the local-time
assertion is deterministic and falsifiable.

## I. Noise (don't chase)
- **Error-message text** (assert type, not message): `local-date.ts:5–7`, `local-time.ts:4–6`, `url.ts:4–6`, `quantity.ts:2–4`, `schedule-day.ts:11`/`14`, `time-range.ts:9`, `schedule-frequency.ts:10`, `schedule.ts:51`, `catalogue.ts:14`/`47`/`67`, `storefront-name.ts:10`.
- **Masked by `toEqual`** (`schedule-day.ts:18:20` Conditional + Logical — `_window` built for start-only/whole-day; `29:9` — whole-day `value()` gains `startTime:undefined`): `toEqual` ignores `undefined` keys, so the day value renders identically. Killable only by switching day-value assertions to `toStrictEqual`; low value.
- **Equivalent — empty-events guard** (`vendor-scoped-events.ts:13:9` Conditional / `13:48` Block): skipping append when `raisedEvents()` is empty is an optimization — appending zero events is itself a no-op, so removing the guard changes nothing observable.
- **Equivalent — other**: `jwt-auth.guard.ts:9:32` (`VERIFIED_VENDOR` symmetric key); `register-market-schedule.ts:22:53` (static false survivor — command built in `it.each([...])` args, so suite fails to collect, not a test failure).
- **Equivalent — ex-Section G** (observable outcome unchanged by the mutation):
  - `cover-photo.ts:17:21` Block (`NoCoverPhoto.sameAs()` `return false` → `undefined`): consumed only in `if (this._coverPhoto.sameAs(…))`, where `undefined` ≡ `false`. It *is* covered (first-time `setCoverPhoto`), not uncalled. `NoCoverPhoto` now `implements CoverPhoto` (real conformance fix), but the truthiness equivalence stands.
  - `jwt-auth.guard.ts:32:63` String (`authorization ?? ''` → junk string): both a missing header and the junk yield a scheme ≠ `'Bearer'` → `UnauthorizedException`. Idiomatic null-guard; equivalence is just JS string handling.
  - `vendor-status.ts:15:29` String (`'unregistered'` → `""`): the only observable is `isRegistered()` (`=== 'registered'`), `false` for both. The `'unregistered'` value carries no testable behaviour (mild value-without-behaviour smell; defensible only if more statuses are coming).
  - `auth.module.ts:21:15` Boolean (`global: true` → `false`): NestJS DI config; near-equivalent, low test value.
