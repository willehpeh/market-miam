# Mutation Gaps

Stryker (`npx nx run test:mutation`), mutating `packages/**/src`, error files excluded (`stryker.conf.mjs`).
701 mutants · 620 killed · 76 survived · 88.45%.

Each survivor = behaviour no test pins. Notation: `file:line:col [Mutator]`, `original → mutated`.

## A. Schedule overlap boundaries (priority)
`schedule-day.ts`, `schedule.ts`.

| Mutant | Change | Gap |
|---|---|---|
| `schedule-day.ts:31:12` Equality | `_startTime < other._endTime` → `<=` | Adjacent/touching ranges (12:00–14:00 then 14:00–16:00) untested. |
| `schedule-day.ts:31:48` Equality | `other._startTime < this._endTime` → `<=` | Same boundary, other side. |
| `schedule-day.ts:31:12` Conditional | `… && …` → `true && …` | Left comparison unproven. |
| `schedule-day.ts:12:9` Logical | `start && end && …` → `start ‖ end && …` | Partial-time day (only start or end) untested. |
| `schedule-day.ts:28:9` Logical | `!start ‖ !end ‖ …` → `!start && !end ‖ …` | Whole-day vs timed overlap mix untested. |
| `schedule.ts:50:12` Method | `_days.some` → `every` | Multi-day where only one day overlaps untested. |
| `schedule.ts:50:40` Method | inner `.some` → `every` | Same, inner loop. |

## B. trim()/empty guards under-asserted (priority)
`url.ts`, `local-time.ts`, `local-date.ts`. Empty tests use bare `.toThrow()` (no type), so bypassing the guard still throws something.

| Mutant | Change | Gap |
|---|---|---|
| `url.ts:16:21`, `local-time.ts:16:21`, `local-date.ts:22:21` Method | `value.trim()` → `value` | Trimming/normalisation unproven. |
| `url.ts:17:9`, `local-time.ts:17:9`, `local-date.ts:23:9` Conditional | `if(!trimmed)` → `if(false)` | Empty-after-trim not asserted as `EmptyValueError`. |
| `url.ts:17:19`, `url.ts:23:13`, `local-time.ts:17:19`, `local-date.ts:23:19` Block | throw-body removed | Same. |

Fix: `.toThrow(EmptyValueError)` + a whitespace case.

## C. Stream IDs & event metadata unasserted (priority)

| Mutant | Change | Gap |
|---|---|---|
| `calendars.ts:23:43`/`24:12`, `vendors.ts:26:43`/`27:12` Block/String | `calendar-${id}`/`vendor-${id}` → empty | Stream-id format unpinned. |
| `calendars.ts:19:7`, `market-days.ts:28:7` ObjectLiteral | `{vendorId: id.value()}` → `{}` | vendorId metadata unasserted. |
| `vendor-id-from.ts:4:20` OptionalChaining | `metadata?.['vendorId']` → `metadata['vendorId']` | Event missing metadata untested. |

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
| `vendors.ts:15:9` Conditional / `:15:45` Block | `if(raisedEvents().length===0) return` → bypassed | No-op save (no new events) unasserted. |
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
- **Error-message text** (assert type, not message): `local-date.ts:5–7`, `local-time.ts:4–6`, `url.ts:4–6`, `quantity.ts:2–4`, `schedule-day.ts:10`/`13`, `schedule-frequency.ts:10`, `schedule.ts:65`, `catalogue.ts:14`/`47`/`67`, `storefront-name.ts:10`.
- **Equivalent**: `jwt-auth.guard.ts:9:32` (`VERIFIED_VENDOR` symmetric key); `register-market-schedule.ts:22:53` (static false survivor — command built in `it.each([...])` args, so suite fails to collect, not a test failure).
