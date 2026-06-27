# Mutation Testing — Surviving Mutants & Test Gaps

Generated from Stryker (`npx nx run test:mutation`) against the `test` project's
vitest suite, mutating `packages/**/src` (error files excluded — see
`stryker.conf.mjs`).

- **Mutants:** 701 · **Killed:** 620 · **Survived:** 76 · **Score:** 88.45%
- Each survivor below is a mutation no test caught — i.e. a behaviour the suite
  does not actually pin. Grouped by the gap revealed, most actionable first.

> Notation: `file:line:col [Mutator]` with the `original → mutated` change.

---

## A. Schedule overlap boundary logic — *highest value*

`schedule-day.ts` / `schedule.ts`. Overlap rules are not pinned at the boundaries.

| Mutant | Change | Gap revealed |
|---|---|---|
| `schedule-day.ts:31:12` EqualityOp | `_startTime < other._endTime` → `<=` | No test for **adjacent/touching ranges** (e.g. 12:00–14:00 then 14:00–16:00). With `<=` they count as overlapping and nothing fails. |
| `schedule-day.ts:31:48` EqualityOp | `other._startTime < this._endTime` → `<=` | Same boundary, other side. |
| `schedule-day.ts:43:12` EqualityOp | `startTime < endTime` → `<=` | **Zero-length interval** (start == end) never tested in `endIsAfterStart`. |
| `schedule-day.ts:31:12` Conditional | `… && …` → `true && …` | Left comparison of overlap never proven. |
| `schedule-day.ts:12:9` LogicalOp | `startTime && endTime && …` → `startTime ‖ endTime && …` | **Partial-time day** (only start or only end) doesn't exercise the after-start check. |
| `schedule-day.ts:28:9` LogicalOp | `!start ‖ !end ‖ …` → `!start && !end ‖ …` | Whole-day-vs-timed overlap mix under-tested. |
| `schedule.ts:50:12` Method | `_days.some(…)` → `.every(…)` | Multi-day schedule where **only one day overlaps** — some-vs-every not distinguished. |
| `schedule.ts:50:40` Method | inner `.some(…)` → `.every(…)` | Same, inner loop. |

---

## B. Value-object `trim()` / empty guards under-asserted

`url.ts`, `local-time.ts`, `local-date.ts`. The empty tests assert bare
`.toThrow()` (no error type), so bypassing the empty-guard still throws
*something* and the test passes anyway.

| Mutant | Change | Gap |
|---|---|---|
| `url.ts:16:21`, `local-time.ts:16:21`, `local-date.ts:22:21` Method | `value.trim()` → `value` | **No test proves trimming happens** (e.g. `" 12:00 "` accepted/normalised). |
| `url.ts:17:9`, `local-time.ts:17:9`, `local-date.ts:23:9` Conditional | `if (!trimmed)` → `if (false)` | Empty-after-trim path not distinguished — tests don't assert it's an `EmptyValueError` specifically. |
| `url.ts:17:19` / `url.ts:23:13`, `local-time.ts:17:19`, `local-date.ts:23:19` Block | throw-body removed | Same: the specific empty/parse rejection isn't pinned. |

**Fix:** change `expect(() => new Url('')).toThrow()` → `.toThrow(EmptyValueError)`,
and add a whitespace-normalisation case.

---

## C. Stream IDs & event metadata never asserted

The persisted stream key and `vendorId` metadata aren't checked.

| Mutant | Change | Gap |
|---|---|---|
| `calendars.ts:23:43` / `calendars.ts:24:12`, `vendors.ts:26:43` / `vendors.ts:27:12` Block/String | `` `calendar-${id}` `` / `` `vendor-${id}` `` → empty | No test pins the **stream-id format**. |
| `calendars.ts:19:7`, `market-days.ts:28:7` ObjectLiteral | `{ vendorId: id.value() }` → `{}` | The **vendorId metadata** written to the store isn't asserted. |
| `vendor-id-from.ts:4:20` OptionalChaining | `metadata?.['vendorId']` → `metadata['vendorId']` | No test with an event **missing metadata** (the `?.` guard). |

---

## D. Event-store internals & defensive copies

| Mutant | Change | Gap |
|---|---|---|
| `in-memory.event-store.ts:27:20` Method | `seedWith` `.filter(e => e.streamId===…)` → all events | Seeding doesn't isolate by stream in tests (multi-stream seed). |
| `in-memory.event-store.ts:27:44` ArrowFn | predicate → `() => undefined` | Same path, empty result not caught. |
| `aggregate.ts:12:12` Method | `_raisedEvents.slice()` → `_raisedEvents` | No test proves `raisedEvents()` returns a **copy** (caller can't mutate internals). |
| `in-memory.event-store.ts:9:41` ArrayDecl | `seededEvents = []` → `[…]` | Initial emptiness not observable — near-equivalent. |
| `in-memory.event-store.ts:15:39` String | optimistic-concurrency message → `` | Message text only (low value). |

---

## E. Checkpoint processor metadata (static cluster)

`checkpointed.decorator.ts`. No test asserts the registered checkpoint metadata.

| Mutant | Change | Gap |
|---|---|---|
| `checkpointed.decorator.ts:18:79`, `checkpointed.decorator.ts:19:22` Block | `CheckpointedProcessor` body / arrow emptied | Processor registration never asserted. |
| `checkpointed.decorator.ts:20:29` ObjectLiteral | `{ name, kind:'processor' }` → `{}` | Registered name+kind not checked. |
| `checkpointed.decorator.ts:20:59`, `checkpointed.decorator.ts:14:59` String | `kind:'processor'` / `'projection'` → `""` | The **kind discriminator** isn't pinned. |

---

## F. Market-day reducer & equality

| Mutant | Change | Gap |
|---|---|---|
| `market-day.ts:29:7` Conditional / `market-day.ts:29:12` String | `case 'ItemMarkedAsSoldOut': break` → fallthrough / `case ""` | Sold-out event's effect on state not asserted. |
| `market-day.ts:32:42` ArrowFn | unplan filter → `() => undefined` | After unplanning, the **remaining items** aren't verified. |
| `item-id.ts:19:12` Conditional | `_value === other._value` → `true` | `ItemId.equals` never tested with **two different ids**. |

---

## G. Branches never exercised

| Mutant | Change | Gap |
|---|---|---|
| `plan-items-for-market-day.handler.ts:35:24` Conditional | `quantity === undefined ? …` → `false ? …` | Planning an item **without a quantity** never tested. |
| `vendors.ts:15:9` Conditional / `vendors.ts:15:45` Block | `if (raisedEvents().length===0) return` → bypassed | Saving a vendor with **no new events** (no-op) not asserted. |
| `cover-photo.ts:17:21` Block | `NoCoverPhoto.sameAs()` `return false` → `{}` | The **null-object** `NoCoverPhoto.sameAs()` is never called in a test. |
| `auth0-token-verifier.ts:39:12` Conditional | `typeof value==='string' ? …` → `true ? …` | Non-string claim value (fallback `''`) not tested. |
| `jwt-auth.guard.ts:32:63` String | `authorization ?? ''` → `?? "…"` | **Missing Authorization header** path not asserted. |
| `vendor-status.ts:15:29` String | `new VendorStatus('unregistered')` → `""` | The `'unregistered'` status value not asserted. |
| `auth.module.ts:21:15` Boolean | `global: true` → `false` | Module global-ness not asserted (config — near-equivalent). |

---

## H. `LocalDate.today()` clock formatting

| Mutant | Change | Gap |
|---|---|---|
| `local-date.ts:35:26` Arithmetic | `getMonth() + 1` → `- 1` | `today()` output never asserted against a fixed clock. |
| `local-date.ts:36:51` String | `padStart(2,'0')` → `padStart(2,"")` | Day **zero-padding** not verified. |

---

## I. By-design noise (don't chase)

- **Error-message text** — you assert error *type*, not message:
  `local-date.ts:5–7`, `local-time.ts:4–6`, `url.ts:4–6`, `quantity.ts:2–4`,
  `schedule-day.ts:10` / `schedule-day.ts:13`, `schedule-frequency.ts:10`,
  `schedule.ts:65`, `catalogue.ts:14` / `catalogue.ts:47` / `catalogue.ts:67`,
  `storefront-name.ts:10`.
- **Equivalent mutants**: `jwt-auth.guard.ts:9:32` (`VERIFIED_VENDOR` symmetric
  key), `register-market-schedule.ts:22:53` (collection-time false survivor —
  the command is built inside `it.each([...])` args, so the mutant is static and
  the suite fails to *collect* rather than a test failing).

---

## Suggested priorities

1. **A — schedule overlap boundaries**: add adjacent/touching, zero-length, and
   partial-time-day cases.
2. **B — tighten bare `.toThrow()`** to specific error types + a trim case.
3. **C — assert stream-id + vendorId metadata** in the event-sourced flows.

These three kill the largest blocks of *real* survivors.
