# Mutation testing report

Stryker 9.6.1 run across every project in the workspace that has tests, on
2026-07-26. Six targets: the `test` package (which mutates `packages/**`) and
each of the five apps that has specs. `apps/website` has no tests and was
skipped.

Reproduce with:

```bash
npx stryker run                                          # packages/**, via the test suite
npx stryker run apps/api/stryker.conf.mjs
npx stryker run apps/admin-api/stryker.conf.mjs
npx stryker run apps/vendor-frontend/stryker.conf.mjs
npx stryker run apps/customer-frontend/stryker.conf.mjs
npx stryker run apps/admin-frontend/stryker.conf.mjs
```

HTML reports land in `reports/mutation/<target>.html`, JSON alongside them.

---

## 1. Scores

Two scores are given because they answer different questions. `total` divides
by every mutant including ones no test ran (`NoCoverage`); `covered` divides
only by mutants a test actually executed. `total` measures *coverage plus
assertion strength*, `covered` measures *assertion strength alone*.

| Target | Mutants | Killed | Survived | NoCoverage | Timeout | Score (total) | Score (covered) | Runtime |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| `packages/**` via `test` | 1523 | 1114 | 94 | 313 | 2 | 73.28% | **92.23%** | 19m01s |
| `apps/api` | 384 | 302 | 47 | 23 | 12 | 81.77% | 86.98% | 13m05s |
| `apps/admin-api` | 67 | 9 | 0 | 58 | 0 | 13.43% | 100.00% | 7s |
| `apps/vendor-frontend` | 1224 | 884 | 296 | 34 | 10 | 73.04% | 75.13% | 52m51s |
| `apps/customer-frontend` | 285 | 179 | 106 | 0 | 0 | 62.81% | 62.81% | 50m40s |
| `apps/admin-frontend` | 5 | 1 | 1 | 3 | 0 | 20.00% | 50.00% | 7s |
| **Workspace** | **3488** | **2489** | **544** | **431** | **24** | **72.05%** | **82.20%** | — |

`customer-frontend` has no `NoCoverage` bucket because it runs under Stryker's
`command` runner, which cannot do per-test coverage analysis — every mutant
re-ran the whole suite, so nothing is ever "uncovered".

### The headline number is misleading, and the reason matters

**72.05% understates the suite. The honest workspace figure is ~78.5%, and for
the domain layer specifically it is 92.23%.**

431 of 3488 mutants are `NoCoverage`, and **285 of them are code that *is*
tested — just not by the suite Stryker ran.** Three distinct causes, all
scoping artifacts rather than test gaps:

| Cause | Mutants | Detail |
|---|---:|---|
| Covered only by Testcontainers specs | 218 | The Postgres adapters under `packages/*/src/**/postgres*.ts` are tested by `test/src/**/*.container.spec.ts`, which `test/vitest.config.mts` deliberately excludes (`'**/*.container.spec.*'` — they need Docker and are slow). Stryker runs that config, so it never runs the specs that kill these mutants. |
| Covered from a different project | 61 | `packages/market-days/src/customer-storefront/find-customer-storefront.handler.ts` is driven end-to-end over HTTP by 7 tests in `apps/api/src/app/market-days/public-storefront.spec.ts`. The root config mutates `packages/**` but only runs the `test` project. |
| Covered from a different project | 6 | `packages/market-days/src/vendor-storefront-view/find-vendor-storefront.handler.ts`, same pattern — exercised from `apps/api`. |

Excluding those 285 from the denominator, the workspace scores **78.46%**.

This is the single most actionable finding in the run: **the root config's
mutation scope and its test scope don't match.** Fixing the measurement is
cheaper and more valuable than chasing any individual survivor, because right
now the number can't be used as a quality gate — it would fail for reasons
unrelated to test quality. See recommendation R1.

---

## 2. What the survivors actually mean, per target

### 2.1 `packages/**` — 92.23% covered-score, genuinely strong

Only 94 real survivors across 217 domain files. The mutator breakdown explains
most of them:

```
StringLiteral 40   ConditionalExpression 21   BlockStatement 12   Regex 4
MethodExpression 3  EqualityOperator 3  ArrayDeclaration 3  BooleanLiteral 2
OptionalChaining 2  ArrowFunction 1  ArithmeticOperator 1  LogicalOperator 1
UnaryOperator 1
```

**Most `StringLiteral` survivors are noise by design.** They are error-message
text inside `throw new InvalidXError('...')`, and the specs assert the error
*type*, not the prose — confirmed in `amend-market-schedule.spec.ts:60,69`,
`cancel-market-schedule.spec.ts:48,62`, `declare-absence.spec.ts:76,87`. The
existing config already excludes `packages/**/*.error.ts` for exactly this
reason; the remaining cases are inline error classes declared in value-object
files (`local-date.ts:6-7`, `url.ts:5-6`, `instant.ts`, `local-time.ts:5-6`,
`quantity.ts:5-6`) which the glob doesn't catch.

**The real gaps worth acting on:**

1. **`Catalogue.apply()` is replay-blind** — `packages/market-days/src/catalogue/catalogue.ts:46` (`case 'ItemRevised':` → `case '':`) and `:54` (`case 'ItemPhotoChanged':` → `case '':`) both survive, as do `item.ts:47` (`revise()` body → `{}`) and `item.ts:54` (`changePhoto()` body → `{}`). Blank the case label and the aggregate silently stops applying that event.

   Root cause: `revise-item.spec.ts` and `change-item-photo.spec.ts` assert only that `store.newEvents()` contains the right event. `Aggregate.raise()` calls `this.apply(event)` synchronously (`aggregate.ts:29-31`), but nothing ever reads the item back, so a broken reducer is invisible. **Fix:** a `test/src/market-days/catalogue.spec.ts` that does `addItem` → `reviseItem` → `changeItemPhoto` and asserts `catalogue.itemWithId(id)` reflects the new name/price/photo.

   Related: `Item`'s getters (`item.ts:19-41`) have zero callers repo-wide, which is why they are also `NoCoverage`. Either the reducer test above starts using them, or they should be deleted.

2. **Absence-range boundaries untested** — `find-upcoming-market-days.handler.ts:43`, two `EqualityOperator` mutants (`<=` → `<` at both ends of the range). `find-upcoming-market-days.spec.ts:132-141` only tests dates strictly inside and outside the range, never the exact endpoints. **Fix:** assert occurrences on exactly `range.from` and `range.to` are `absent: true`.

3. **`ScheduleDay`'s partial-hours branch is invisible to `toEqual`** — `schedule-day.ts:19`: `startTime && endTime ? new TimeRange(...) : undefined` survives mutation to `true ? ...`. `TimeRange`'s guard is `end <= start`, and `undefined <= '08:00'` is `false` in JS, so `TimeRange('08:00', undefined)` doesn't throw. `register-market-schedule.spec.ts:157-167` compares with `toEqual(command.days)`, and Vitest's `toEqual` treats an explicit `undefined` value as equal to a missing key — so the mutant is structurally unobservable through that assertion. **Fix:** a direct `ScheduleDay` spec using `not.toHaveProperty('endTime')`.

4. **Shredding key-cache and PII-absent paths** — `shredding.event-store.ts:73` (`if (key === undefined)` → `true`) survives because no spec registers two PII fields on one event, so the per-event key cache is never exercised. `:47` (3 mutants on the PII-field filter) survives because every fixture's PII field is always present. `:83-84` survives because no spec *loads* a PII event stored without metadata.

5. **Not-found branches in in-memory read models** — `in-memory-market-schedule.views.ts` L21/22/33/34: the shared contract spec never calls `amendSchedule`/`recordAbsence` with an unknown `scheduleId`.

**Genuinely untested (not an artifact):**
`packages/auth/src/development-token-verifier.ts` (8 mutants) — no spec anywhere. It decides dev-mode auth identity (`verify('dev')` → fallback vendor, `verify('dev:X')` → vendor `X`). Small and cheap to cover.

Everything else in the non-artifact `NoCoverage` list is dead or unused code
rather than a missing test: `in-memory.event-store.ts`'s `seedWith()` and
`lastEvent()` have no production callers, and the single-mutant files
(`auth0-token-verifier.ts:17`, `static-token-verifier.ts:9`, `projection.ts:6`,
the two `*.projection.ts` lines) are too small to justify dedicated specs.

### 2.2 `apps/api` — 86.98% covered-score

**`dev-seed.ts` (16 survivors) should not be blanket-excluded.** It is not
test-only: `main.ts:25-26` calls `seedDev(app)` when `NODE_ENV=development`, so
it ships. 13 of the 16 survivors are `StringLiteral`/`ObjectLiteral` mutants on
demo copy (vendor name, dish descriptions, market address, lines 43-55) and are
legitimate noise — `dev-seed.spec.ts` asserts structure (`toHaveLength(3)`), not
prose. The other 3 are a real gap: the `upcomingSaturday()` date helper
(lines 67-73) has genuine conditional and arithmetic logic that nothing tests
directly. Export it and assert: advances a non-Saturday to Saturday, no-ops when
already Saturday, `weeksAhead` jumps exactly 7×N days.

**`fake-signed-uploads.ts` (5 survivors) should be excluded.** It is referenced
only from `apps/api/src/app/testing/api-test-app.ts:36,47`; production DI
(`market-days.module.ts:53` → `signed-uploads.factory.ts`) always builds
`CloudinarySignedUploads`. This is the same category the frontend configs
already exclude via `!apps/**/fake.*.ts`. Add `'!apps/api/src/**/fake-*.ts'`
(note: hyphen here, dot in the frontends).

**`master-key.ts` (14 NoCoverage + 1 survivor) is a real gap, not a container
artifact.** There are no `*.container.spec.*` files anywhere under `apps/api`, so
the artifact that dominates `packages/**` does not apply here. `master-key.spec.ts`
only covers the `config.getOrThrow` branch; the whole of `fromSecretFile()`
(lines 20-28, reading `/etc/secrets/.env`) never executes because
`existsSync(SECRET_FILE)` is false under test. Mock `node:fs` and cover: key
found, line missing (throws), trailing whitespace trimmed.

**`migrations.ts` (8 NoCoverage)** needs a `migrations.container.spec.ts`, not a
unit test — `onModuleInit()` runs `node-pg-migrate` against real Postgres and all
8 mutants are config literals.

**Other real gaps:** `catalogue.controller.ts:82` — `changePhoto()`'s body can be
emptied and survive; there is no coverage of `PUT /catalogue/:itemId/photo`.
`tracing/event-handler.ts:26` — `Date.now() - event.timestamp` → `+` survives
because the spec asserts `expect.any(Number)`; use a fixed past timestamp and a
tight bound. `tracing/postgres-notifications.ts:40` — `error !== undefined` →
`true` survives because `toMatchObject` tolerates the stray attribute; assert
`error.message` is `undefined` on success spans.

**~2/3 of the 28 `StringLiteral` survivors are unkillable by design** — about 10
are `trace.getTracer('<name>')` labels, and no assertion can observe which tracer
object emitted a span. A realistic ceiling for this app is ~88-90%, not 100%.

### 2.3 `apps/admin-api` — the 100% covered-score is an illusion

`score(covered)=100%` with `score(total)=13.43%` is the signature of an app
where the one test that exists is good and 87% of the code has no test at all.
`users.spec.ts` is a real HTTP test, but `bootAdminTestApp` wires
`testing/fake-auth0-users.ts` and `testing/fake-subdomains.ts`, so **both of the
app's real external integrations are completely unverified.** No container specs
exist here either.

Priority order for first specs:

1. **`auth0/management-api-auth0-users.ts` (41 mutants, zero coverage)** — the real
   Auth0 Management API client. Its `all()` pagination loop (`for (page=0; page<10; page++)`,
   breaking when `batch.length < 100`) is precisely the shape where an off-by-one
   ships silently: test that it keeps paging at exactly 100, stops below 100, and
   hard-caps at 10 pages. Then `page()`'s response mapping (`email ?? ''`,
   `app_metadata?.vendorId`) and `token()`'s happy path plus `!response.ok` throw,
   via a mocked `global.fetch`.
2. **`require-env.ts` (5 mutants)** — a two-line function; cheapest possible win.
3. **`subdomains/postgres-subdomains.ts` (8 mutants)** — needs a Testcontainers spec.
4. `app.controller.ts` / `app.service.ts` (4 combined) — boilerplate, lowest priority.

### 2.4 `apps/vendor-frontend` — 75.13% covered-score, but ~a third of the gap is unkillable by design

The largest target: 1224 mutants over 63 files, 22 spec files / 176 tests.
Survivors and `NoCoverage` combined (330) break down as:

```
StringLiteral 133  ConditionalExpression 38  ObjectLiteral 33  BooleanLiteral 26
BlockStatement 22  ArrowFunction 21  MethodExpression 13  EqualityOperator 9
ArrayDeclaration 9  OptionalChaining 8  LogicalOperator 7  ArithmeticOperator 6
Regex 5
```

**The NgRx state files score worst across the board — and most of it is a
structural equivalence, not a test gap.** Every `*.state.ts` file is near the
bottom (`notifications.state.ts` 33%, `onboarding.state.ts` 38%,
`auth.state.ts` 45%, `catalogue.state.ts` 57%, `market-schedule.state.ts` 59%),
and together they hold **101 of the 330** not-killed mutants — 59 of which are
`StringLiteral`.

Those `StringLiteral` mutants are the action type strings and feature names, and
they are **structurally unkillable**. In `notifications.state.ts:3-4`:

```ts
export const ErrorRaised = createAction('[Notifications] Error Raised', props<{ message: string }>());
```

A test dispatches `ErrorRaised(...)` and the reducer matches `on(ErrorRaised, ...)`.
Both sides reference the same imported constant, so mutating the string literal
moves both together and nothing can observe it. Same for `name: 'notifications'`
in `createFeature` (`:15`) — the selectors are derived from that same object.
This is the identical equivalence class as the `SHREDDED` constant in
`packages/`. No assertion can kill these; the only way to change the number is
to exclude them.

Once those are set aside, the genuine state-file gaps are the reducers nothing
dispatches — e.g. `notifications.state.ts:19`, where the `ErrorDismissed`
reducer's `ArrowFunction` mutates to `() => undefined` and survives, meaning no
test dispatches `ErrorDismissed` and asserts the message is cleared. That is a
real, cheap fix, and the pattern repeats across the other state files.

**`onboarding/welcome.ts` at 0% is a false alarm.** All 13 survivors are the
`features` array (`:36`) and the `icon`/`title`/`detail` strings of its three
objects (`:37-39`) — static marketing copy. Stryker does not decompose the
inline template literal, so the component's only actual behaviour (the button
navigating to `/onboarding/storefront`) has no mutable logic to kill.
`welcome.spec.ts` asserts exactly that navigation and is a reasonable test. The
0% is an artefact of the file being almost entirely static content. At most, add
one assertion that the three feature titles render.

**The real concentrations worth reading are the two big forms.**
`markets/add-schedule.ts` (48 survivors, 22 of them `StringLiteral`) and
`catalogue/add-dish.ts` (42 survivors) are large form components, and
`dashboard.ts` (22 survivors, 83.94%) is the heaviest. `catalogue-list.ts`,
`http.catalogue.ts`, `http.market-schedules.ts`, `cloudinary-url.pipe.ts`,
`layout.ts`, `landing.ts` and `cloudinary.photo-uploads.ts` all score **100%** —
so the suite is demonstrably capable of killing mutants when it asserts
behaviour. The weak spots are concentrated in state plumbing and large form
components, not spread evenly.

**All 10 timeouts here are genuine infinite loops** — see §3; they are the
`createEffect(..., { dispatch: false })` flags.

**`NoCoverage` (34)** is small and mostly thin DI adapters: `auth0.auth.ts` (7,
the Auth0 SDK wrapper), `store.notifications.facade.ts` (1),
`store.auth.facade.ts` (1), `cover-photo-transformation.ts` (1). These are
wiring rather than logic; not worth dedicated specs.

### 2.5 `apps/customer-frontend` — 62.81%, the weakest target

No `NoCoverage` bucket, so all 106 survivors genuinely ran against all 25 tests
and none noticed. The run **confirms every "Proved" finding in
`docs/CUSTOMER-FRONTEND-TEST-AUDIT.md`** and adds two clusters the audit didn't
name.

**`app.routes.ts` — 0%, 4/4 survived. Highest severity in the whole report.**
The route array, the route object, the `path: ''` string and the
`resolve: { storefront: storefrontResolver }` wiring all mutate freely with the
suite green. In production this wiring is what makes any vendor subdomain render
a storefront at all. This independently corroborates audit §2.2.

**`storefront-page.ts` metadata wiring is unasserted.** `storefront-page.spec.ts`
never mentions `StorefrontMetadata` (verified by grep — zero matches). That single
gap also explains 5 of `request-url.ts`'s 6 survivors: `currentOrigin()`'s result
is only ever consumed by `this.metadata.set(...)`, so nothing downstream is
checked. The server branch (`if (request)` → `false`) survives; forcing it `true`
was killed only *accidentally*, because `new URL(null.url)` throws. `request-url.ts`
implements the same proxy-host subtlety that `storefront.resolver.spec.ts` tests
explicitly — but with no equivalent coverage of its own.

**`storefront-metadata.ts` (21 survivors) — cheapest high-value fix in the run.**
The spec has 19 assertions but never checks `twitter:title`, `name="description"`,
`twitter:description`, `og:image:width`, `og:image:height` or `og:image:alt`
(verified by grep). Adding those assertions to the two existing tests — no new
fixtures needed — kills roughly 20 mutants. This file decides what a shared link
looks like on social media, which is the entire point of the SSR setup in ADR 0019.

**`storefront-view-model.ts` (25 survivors) — one fixture gap explains most of it.**
`storefront-view-model.spec.ts` has one test case and always passes
`upcomingMarkets: []`. Consequently 5 of 7 entries in the `WEEKDAYS` dictionary
(`:84`) and 11 of 12 in `MONTHS` (`:85`) are never read; `marketHours` (`:103`,
4 mutants) never sees a market with only one of `startTime`/`endTime`; and
`formatHour`'s `if (!time)` guard (`:107-109`) never runs. One test with a market
on an unused weekday and only a start time kills that whole cluster.

**`drag-to-dismiss.ts` (25 survivors) — no spec file exists** (verified). It is
exercised only indirectly by 3 tests in `storefront-page.spec.ts` that assert the
final `dialog.open` boolean. The majority of these survivors are real, because the
directive holds a genuine state machine:
- `:68` — the `DISMISS_RATIO` boundary (`>` → `>=`) survives; test offsets are 20px and 300px against a 40px threshold, so neither lands on the boundary.
- `:58` — `Math.max(0, offset)` → `Math.min` survives; the mid-drag `dragTo` value that drives `[style.transform]` is never asserted, only the end state. The sheet could stop following the finger entirely and the suite would stay green.
- `:44-49` — the "swipe up cancels the drag" branch (5 mutants) survives; no test ever drags upward.
- `:78-82` (`touchmove`/`preventDefault`) and `:84-88` (`pointercancel` → `reset()`) are entirely untested. The latter is exactly audit §2.6.

Given the recent commit history here ("Scroll the whole dish sheet, drag to
dismiss only from the top", "Reset dish sheet scroll position on open"), this is
actively-changing gesture code with thin verification.

**`dish-sheet.ts` (18 survivors)** — all 8 mutants on `onSlideEnd()` (`:143-148`)
survive because no test dispatches `transitionend`, and the 4 on `dismiss()`'s
`matchMedia` branch (`:136-138`) survive because jsdom has no `matchMedia`. Both
confirm audit §2.5: the real dismissal path never runs. Stubbing `matchMedia`
kills ~12 mutants.

**`coming-soon-page.ts` — 0%, 4/4 survived, no spec.** The survivors are the
`robots: noindex` tag, which is what stops Google indexing unpublished vendor
subdomains — a real duplicate-content concern for a multi-tenant subdomain app.

Not worth chasing: `og:type: 'website'` (`:48`), the `{ optional: true }` DI flags
in the resolver and `request-url.ts` (the token is always provided, in tests and
in real SSR), and the `MONTHS[...] ?? ''` out-of-range fallback. Expect ~15-20 of
the 106 survivors to remain legitimately equivalent even after all the above.

### 2.6 `apps/admin-frontend` — 5 mutants total

Too small to read much into. `app.routes.ts` is 0% (3 `NoCoverage`) for the same
reason as customer-frontend: no routing test. `users.ts` is 50% (1 survivor). The
real signal is that the app has 2 tests, matching its size.

---

## 3. Timeouts: 3 genuine infinite loops, 21 false positives

Stryker counts `Timeout` as killed, so these don't hurt the score — but the
distinction matters, because a genuine timeout means a loop guard with **zero
redundancy**: mutate it and the process hangs rather than failing a test.

**Genuine (verified by reading the source):**

- `apps/api/src/app/event-sourcing/subscriptions.ts:84` — `for (let i = 0; i < this.consumers.length; i++)` → `i--`. `drain()` is called with non-empty consumer lists in `subscriptions.spec.ts:302,338,382`, so those tests really do hang.
- `apps/api/src/app/dev-seed.ts:69` — the body of `while (date.getUTCDay() !== 6)` emptied, so the date never advances.
- `apps/api/src/app/dev-seed.ts:70` — the same loop's `date.setUTCDate(date.getUTCDate() + 1)` mutated so it stops advancing.

**All 10 vendor-frontend timeouts are one pattern, and it is a genuine hang
class** — each is an `ObjectLiteral`/`BooleanLiteral` pair on a
`createEffect(..., { dispatch: false })` argument
(`auth.effects.ts:23`, `:40`, `catalogue.effects.ts:123`,
`market-schedule.effects.ts:69`, `onboarding.effects.ts:52`). Mutating to `{}` or
`{ dispatch: true }` makes a `tap`-only effect dispatch its own source action back
into the store, which re-triggers the effect: an infinite action loop. Correctly
killed, and worth knowing that NgRx `dispatch: false` is load-bearing.

**Likely false positives (9 in `apps/api`):** the five
`trace.getTracer('<name>')` `StringLiteral` mutants, `subscriptions.ts:53`
(a class-field default unconditionally overwritten by `buildConsumers()` during
`onApplicationBootstrap`), `subscriptions.ts:119` and `:180` (neither touches a
loop bound), and `tracing/event-store.ts:24` (dropping `?.` would *throw*, not
hang). These are all static, module-load-time mutants, so Stryker re-runs the
entire suite for each one — and this run had two Stryker processes competing for
4 cores. Re-run `apps/api` alone to confirm; expect them to reclassify as
`Survived`.

---

## 4. Recommendations, in priority order

### R1. Make the mutation scope match the test scope (highest value)

The root config mutates `packages/**` but runs only the `test` project, so 285
mutants are reported as untested code when they are simply tested elsewhere.
Until this is fixed the score cannot serve as a CI gate. Options, best first:

- **Add a second Stryker config that runs the container suite** against the
  Postgres adapters: mutate `packages/**/src/**/postgres*.ts` plus
  `append-transaction.ts`, with `vitest.configFile: 'test/vitest.container.config.mts'`.
  That reclaims 218 mutants and puts the adapters under real measurement.
- **Move the two query handlers' coverage into `test/`**, or exclude
  `find-customer-storefront.handler.ts` and `find-vendor-storefront.handler.ts`
  from the root `mutate` glob with a comment pointing at
  `apps/api/.../public-storefront.spec.ts`. The former is better — a handler this
  logic-heavy (subdomain resolution, publication status, `MAX_UPCOMING` cap, Paris
  wall-clock conversion) deserves a fast unit spec regardless of the HTTP test.
- Then set `thresholds` in each config so the score becomes a gate.

### R2. Exclude what genuinely cannot be killed

Cheap, and it stops the number lying in the other direction:
- `'!apps/api/src/**/fake-*.ts'` — test doubles in `src/` (5 survivors).
- Extend the inline-error-class exclusion, or move those classes into `*.error.ts`
  files so the existing `!packages/**/*.error.ts` glob catches them (~40 `StringLiteral` survivors).
- Consider excluding `trace.getTracer()` label lines, or accept ~10 permanent survivors in `apps/api`.
- **NgRx action type strings and `createFeature` names in `vendor-frontend`'s
  `*.state.ts` files (~59 `StringLiteral` survivors)** cannot be killed by any
  assertion — the dispatch site and the reducer both read the same constant.
  Either add `// Stryker disable next-line StringLiteral` on the
  `createAction`/`createFeature` lines, or accept them and read
  `vendor-frontend`'s score as ~5 points higher than reported.

### R3. Fix the three test-design flaws the run exposed

These are worth more than their mutant counts, because each is a *pattern* that
will keep producing weak tests:

1. **Assert aggregate state, not just emitted events.** `Catalogue.apply()`'s
   reducer can be disabled without a single failure. Any event-sourced aggregate
   tested only through `store.newEvents()` has this hole.
2. **`toEqual` hides `undefined`.** `ScheduleDay`'s partial-hours branch is
   invisible because `toEqual` treats a missing key and an explicit `undefined` as
   equal. Use `not.toHaveProperty` where absence is the behaviour.
3. **`expect.any(Number)` / `toMatchObject` assert too little.** They are why the
   OTel lag calculation (`event-handler.ts:26`) and the error-attribute branch
   (`postgres-notifications.ts:40`) survive.

### R4. Highest-value new tests, ranked by mutants-killed-per-effort × risk

1. `customer-frontend` — assert the metadata wiring in `storefront-page.spec.ts` (also fixes `request-url.ts`).
2. `customer-frontend` — a routing test for `app.routes.ts`; replace the vacuous smoke test in `app.spec.ts` with `RouterTestingHarness`.
3. `customer-frontend` — add the 6 missing tag assertions to `storefront-metadata.spec.ts`. Assertion-only, ~20 mutants.
4. `admin-api` — a spec for `management-api-auth0-users.ts`, starting with the pagination loop. 41 mutants and a completely unverified external integration.
5. `packages` — a `catalogue.spec.ts` asserting aggregate state after revise/change-photo.
6. `customer-frontend` — one `upcomingMarkets` fixture in `storefront-view-model.spec.ts`, killing the weekday/month/hours cluster.
7. `customer-frontend` — stub `matchMedia` so `dish-sheet.ts`'s real dismissal path runs (~12 mutants).
8. `customer-frontend` — a direct `drag-to-dismiss.spec.ts` covering the ratio boundary, the two-phase slop threshold, the upward-swipe cancel, and `pointercancel`.
9. `api` — cover `master-key.ts`'s `fromSecretFile()`, and `PUT /catalogue/:itemId/photo`.
10. `vendor-frontend` — dispatch each unexercised reducer action and assert the resulting state, starting with `ErrorDismissed` in `notifications.state.ts`. Cheap and repeats across all five state files.
11. `packages` — a `development-token-verifier.spec.ts`; boundary dates in `find-upcoming-market-days.spec.ts`.

### R5. Don't target 100%

Realistic ceilings, given the survivors that are equivalent by design:
`packages` ~95%, `apps/api` ~88-90%, `vendor-frontend` ~85% (≈59 unkillable NgRx
action strings plus `welcome.ts`'s static copy), `customer-frontend` ~85% (≈15-20
of its 106 survivors are legitimately unkillable). Setting thresholds above those
will generate busywork.

Note the ranking of targets by *score* is not the ranking by *risk*.
`admin-api` scores 13.43% but is a small internal tool; `customer-frontend`
scores 62.81% and is the public, SSR-rendered, SEO-dependent storefront every
customer sees. Fix `customer-frontend` first.

### R6. Delete dead code the run surfaced

`Item`'s getters (`item.ts:19-41`), `InMemoryEventStore.seedWith()` and
`lastEvent()` have no production callers. They show as `NoCoverage` because
nothing calls them at all.

---

## 5. Notes on running this

- **Runtime.** The full sweep is ~2h15m of wall clock on 4 cores, dominated by the two Angular apps. `packages` (19m) and `api` (13m) are cheap enough for regular use; the frontends are not.
- **Parallel runs need `ignorePatterns`.** Stryker only auto-ignores its own `tempDirName`, so concurrent runs copy each other's sandboxes and race with cleanup (`ENOENT` on `copyfile`). Every config now sets `ignorePatterns: ['/.stryker-tmp', '/coverage', '/dist', '/.nx', '/.angular', '/reports']`, which also cut the sandbox from 3788 files to 751.
- **Don't run two at once if you care about timeouts.** CPU contention produced ~9 false `Timeout` verdicts in `apps/api`, and inflated Stryker's own ETA for `vendor-frontend` from ~50m to a projected 3h.
- **`customer-frontend` is slow for a structural reason.** It cannot use Stryker's vitest runner: the app declares signal-based inputs (`input()`, `input.required()`, `viewChild()`), and `parseInputsArray()` in `@angular/compiler` hardcodes `isSignal: false` for decorator metadata, so JIT-compiled `TestBed.setInput` fails with `NG0303`. Only ngtsc (AOT) compiles them. It therefore uses the `command` runner with `coverageAnalysis: 'off'`, re-running all 25 tests per mutant. **Installing `@analogjs/vite-plugin-angular`** (real ngtsc in a Vite plugin) would let it use `perTest` analysis and cut its runtime by roughly an order of magnitude. That is the one dependency worth adding.
- `vendor-frontend` and `admin-frontend` use the standalone JIT configs in `tools/vitest/angular-jit.mts`, which reproduce `nx test` exactly (176/176 and 2/2 respectively). `isolate: true` is mandatory there — with Vitest's `isolate: false`, TestBed state leaks between spec files and 151 tests fail.
