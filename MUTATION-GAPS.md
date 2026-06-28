# Mutation Gaps

Stryker (`npx nx run test:mutation`), mutating `packages/**/src`, error files excluded (`stryker.conf.mjs`).
661 mutants · 595 killed · 61 survived · 90.02%.

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

## F. Market-day reducer & equality

| Mutant | Change | Gap |
|---|---|---|
| `market-day.ts:29:7` Conditional / `:29:12` String | `case 'ItemMarkedAsSoldOut': break` → fallthrough / `case ""` | Sold-out event effect on state unasserted. |
| `market-day.ts:32:42` ArrowFn | unplan filter → `() => undefined` | Remaining items after unplan unverified. |
| `item-id.ts:19:12` Conditional | `_value === other._value` → `true` | `ItemId.equals` untested with two different ids. |

## G. Branches never exercised

| Mutant | Change | Gap |
|---|---|---|
| `plan-items-for-market-day.handler.ts:35:24` Conditional | `quantity === undefined ? …` → `false ? …` | Planning without quantity untested. |
| `cover-photo.ts:17:21` Block | `NoCoverPhoto.sameAs()` `return false` → `{}` | Null-object `NoCoverPhoto.sameAs()` never called. |
| `auth0-token-verifier.ts:39:12` Conditional | `typeof value==='string' ? …` → `true ? …` | Non-string claim (fallback `''`) untested. |
| `jwt-auth.guard.ts:32:63` String | `authorization ?? ''` → `?? "…"` | Missing Authorization header untested. |
| `vendor-status.ts:15:29` String | `new VendorStatus('unregistered')` → `""` | `'unregistered'` value unasserted. |
| `auth.module.ts:21:15` Boolean | `global: true` → `false` | Near-equivalent (config). |

## H. LocalDate.today() formatting

| Mutant | Change | Gap |
|---|---|---|
| `local-date.ts:35:26` Arithmetic | `getMonth() + 1` → `- 1` | `today()` not asserted against a fixed clock. |
| `local-date.ts:36:51` String | `padStart(2,'0')` → `padStart(2,"")` | Day zero-padding unverified. |

## I. Noise (don't chase)
- **Error-message text** (assert type, not message): `local-date.ts:5–7`, `local-time.ts:4–6`, `url.ts:4–6`, `quantity.ts:2–4`, `schedule-day.ts:11`/`14`, `time-range.ts:9`, `schedule-frequency.ts:10`, `schedule.ts:51`, `catalogue.ts:14`/`47`/`67`, `storefront-name.ts:10`.
- **Masked by `toEqual`** (`schedule-day.ts:18:20` Conditional + Logical — `_window` built for start-only/whole-day; `29:9` — whole-day `value()` gains `startTime:undefined`): `toEqual` ignores `undefined` keys, so the day value renders identically. Killable only by switching day-value assertions to `toStrictEqual`; low value.
- **Equivalent — empty-events guard** (`vendor-scoped-events.ts:13:9` Conditional / `13:48` Block): skipping append when `raisedEvents()` is empty is an optimization — appending zero events is itself a no-op, so removing the guard changes nothing observable.
- **Equivalent — other**: `jwt-auth.guard.ts:9:32` (`VERIFIED_VENDOR` symmetric key); `register-market-schedule.ts:22:53` (static false survivor — command built in `it.each([...])` args, so suite fails to collect, not a test failure).
