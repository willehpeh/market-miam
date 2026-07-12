# Test Suite Audit — behaviour, implementation coupling & overlap

Initial audit: 2026-07-09 (78 spec files). **Re-audit: 2026-07-12** — 38 spec
files changed since (22 added, 16 modified) from the market-schedule, catalogue,
and amend/cancel/absence work; the suite is now **100 spec files (583 test
cases)** across `apps/*`, `packages/*` and the shared `test/` package.

> **Re-audit update (2026-07-12) is in [§6](#6-re-audit--changes-since-the-initial-audit-2026-07-12).**
> It re-scores the 38 changed files, checks whether prior findings were fixed,
> and re-maps overlap. §1's metrics reflect the **current full suite**; §3's
> per-file scorecard is the initial-audit snapshot (see §6 for the changed files).

Rubric: the project's own testing doctrine,
[ADR 0006 — Outside-in TDD with fakes at boundaries](adr/0006-outside-in-tdd-with-fakes.md).
A test scores well when it exercises a whole use case / public behaviour through
its public surface, substitutes **only infrastructure ports** with hand-written
in-memory fakes, and asserts on **observable outcomes** (emitted events,
read-model state, HTTP responses, rendered DOM) rather than internal structure.
Asserting on emitted domain events and substituting a real port with a fake are
**correct** here and are not counted as coupling.

> How this was produced: a multi-agent audit read every spec (and the code under
> test where needed to judge an assertion), scored each file 1–5, catalogued
> every implementation-coupling finding, and built a normalized inventory of the
> behaviours each file verifies. A final pass cross-referenced that inventory to
> map coverage overlap. Findings below are the merged, de-duplicated result.

---

## 1. Executive summary

**The suite is in excellent health and lives up to ADR 0006.** It is
overwhelmingly behavioural, boundary-faked, and refactor-resilient. There are
**no high-severity coupling defects** anywhere in the suite.

Metrics below are the **current full suite** (100 files) as of the 2026-07-12
re-audit. Initial-audit (78-file) figures are shown in parentheses for reference.

| Metric | Result (current) |
|---|---|
| Spec files | 100 *(was 78)* |
| Test cases | 583 *(was 403)* |
| Score 5 (purely behavioural, refactor-proof) | **76 files (76%)** *(was 56 / 72%)* |
| Score 4 (behavioural, minor over-specification) | 20 files (20%) |
| Score 3 (mixed) | 3 files |
| Score 2 (a near no-op assertion) | 1 file |
| Verdict: behavioural / mostly-behavioural | 96 files (96%) |
| Coupling findings total | 44 (0 high · 6 medium · 38 low) |
| Files with ≥1 finding | 39 |
| Overlap clusters identified | 24 total (2 redundant-duplicate · 10 partial · 12 layered-intentional) |

The re-audit found **no high-severity coupling** in any of the 38 changed files,
none scoring below 4, and one prior finding fixed. The delta held the line on
quality; see §6 for what it added to overlap.

**What's working (keep doing this):**
- Value objects and the shared kernel are textbook: they assert on `value()`
  output and typed domain errors only — a full 8/8 and 2/2 at score 5.
- Domain use cases drive `command → aggregate → events` and assert on the
  emitted events (the domain's public contract), with `InMemoryEventStore` as
  the only substitute.
- The port **contract** specs (`*.contract.spec.ts`) and their Postgres
  **container** counterparts are the right pattern for "one contract, N adapters".
- Frontend tests mostly query by role/label via `@testing-library/angular` and
  assert on user-visible state through `Fake*Facade` boundaries.
- `postgres-data-keys.container.spec.ts` is the **model of correct
  non-redundant layering**: it tests only what real infrastructure can uniquely
  break (key wrapping, concurrency), not the in-memory contract again. Use it as
  the template when trimming other container specs.

**Where to invest (in priority order):**
1. **One DRY opportunity (not a coverage cut):** the `stamps vendor id into
   event metadata` assertion is copy-pasted across **11** market-days use-case
   specs. It can be consolidated into one **parameterized** test that drives
   every command handler — but each handler must stay a case, since a single
   handler bypassing the shared stamping mechanism is only caught per-command.
   Do not replace it with one isolated wrapper/dispatcher test. *(§4.1)*
2. **Two thin smoke tests** assert essentially nothing:
   `customer-frontend` `app.spec` (score 2) checks only that a class symbol is
   defined; `admin-frontend` `app.spec` (score 3) renders but asserts no
   user-visible behaviour. *(§3, rows flagged)*
3. **Five medium coupling findings** pin internal wire-formats / class identity
   and should be reworded to assert the underlying behaviour. *(§3.1)*
4. **Contract drift risk:** two adapter-spec pairs hand-copy identical 17- and
   8-behaviour lists. Drive both from a single shared contract factory. *(§4.2)*
5. **Tracing & correlation plumbing** is re-asserted 4–5× across specs; extract
   one wrapper contract + one canonical propagation test. *(§4.2)*

Net: roughly **20–30 assertions** could be **centralized** (mostly relocated into
shared parameterized suites, not deleted) with no loss of confidence — provided
consolidation keeps driving each real handler/adapter as its own case rather than
collapsing to a single isolated test. See §4.1 for a worked example of that
distinction.

---

## 2. How to read the scorecard

- **Score** 1–5 per ADR 0006 (5 = purely behavioural & refactor-proof; 3 = mixed;
  2 = asserts almost no behaviour).
- **Verdict** — `behavioural`, `mostly-behavioural`, `mixed`.
- **Coupling findings** — count and severities: `H`igh / `M`edium / `L`ow.
  A finding means an assertion couples to an implementation detail (internal
  wire-format, private state, class identity, message text, DOM structure) such
  that a behaviour-preserving refactor would break the test. `—` means none.

Fakes-at-boundaries and event assertions are **not** findings.

---

## 3. Per-file scorecard

#### common/value-objects

| Spec | Tests | Score | Verdict | Coupling findings |
|---|---:|:---:|---|---|
| `common/date-clock.spec.ts` | 3 | 5 | behavioural | — |
| `common/email.spec.ts` | 17 | 5 | behavioural | — |
| `common/image-reference.spec.ts` | 6 | 5 | behavioural | — |
| `common/instant.spec.ts` | 20 | 5 | behavioural | — |
| `common/local-date.spec.ts` | 12 | 5 | behavioural | — |
| `common/local-time.spec.ts` | 15 | 5 | behavioural | — |
| `common/phone-number.spec.ts` | 3 | 5 | behavioural | — |
| `common/url.spec.ts` | 11 | 5 | behavioural | — |

#### shared-kernel/ids

| Spec | Tests | Score | Verdict | Coupling findings |
|---|---:|:---:|---|---|
| `shared-kernel/market-id.spec.ts` | 4 | 5 | behavioural | — |
| `shared-kernel/vendor-id.spec.ts` | 4 | 5 | behavioural | — |

#### auth

| Spec | Tests | Score | Verdict | Coupling findings |
|---|---:|:---:|---|---|
| `auth/auth.integration.spec.ts` | 5 | 5 | behavioural | 1 (L) |
| `auth/auth0-token-verifier.spec.ts` | 8 | 5 | behavioural | — |

#### event-sourcing/port-contracts

| Spec | Tests | Score | Verdict | Coupling findings |
|---|---:|:---:|---|---|
| `event-sourcing/in-memory-checkpoint.contract.spec.ts` | 2 | 5 | behavioural | — |
| `event-sourcing/in-memory-data-keys.contract.spec.ts` | 7 | 5 | behavioural | 1 (L) |
| `event-sourcing/in-memory-event-store.contract.spec.ts` | 17 | 5 | behavioural | — |
| `event-sourcing/in-memory-events.contract.spec.ts` | 4 | 5 | behavioural | — |
| `event-sourcing/message-context.event-store.contract.spec.ts` | 17 | 5 | behavioural | — |
| `event-sourcing/polling-subscription.contract.spec.ts` | 6 | 5 | behavioural | 1 (L) |

#### event-sourcing/core

| Spec | Tests | Score | Verdict | Coupling findings |
|---|---:|:---:|---|---|
| `event-sourcing/checkpointed-projection.decorator.spec.ts` | 3 | 4 | mostly-behavioural | — |
| `event-sourcing/shredding.event-store.spec.ts` | 10 | 4 | mostly-behavioural | 2 (LM) |
| `event-sourcing/message-context.spec.ts` | 1 | 5 | behavioural | — |

#### event-sourcing/postgres-container

| Spec | Tests | Score | Verdict | Coupling findings |
|---|---:|:---:|---|---|
| `event-sourcing/postgres/schema.container.spec.ts` | 2 | 3 | mixed | 2 (LM) |
| `event-sourcing/postgres/postgres-data-keys.container.spec.ts` | 3 | 4 | mostly-behavioural | 1 (L) |
| `event-sourcing/postgres/postgres-notifications.container.spec.ts` | 7 | 4 | mostly-behavioural | 1 (M) |
| `event-sourcing/postgres/postgres-event-store.container.spec.ts` | 1 | 5 | behavioural | — |
| `event-sourcing/postgres/postgres-subscription.container.spec.ts` | ? | 5 | behavioural | — |

#### market-days/catalogue-item-usecases

| Spec | Tests | Score | Verdict | Coupling findings |
|---|---:|:---:|---|---|
| `market-days/add-item-to-catalogue/add-item-to-catalogue.spec.ts` | 13 | 5 | behavioural | — |
| `market-days/change-item-price/change-item-price.spec.ts` | 4 | 5 | behavioural | — |
| `market-days/mark-item-as-sold-out/mark-item-as-sold-out.spec.ts` | 6 | 5 | behavioural | — |
| `market-days/plan-items-for-market-day/plan-items-for-market-day.spec.ts` | 11 | 5 | behavioural | 1 (L) |
| `market-days/retire-item/retire-item.spec.ts` | 3 | 5 | behavioural | — |
| `market-days/unplan-item-from-market-day/unplan-item-from-market-day.spec.ts` | 6 | 5 | behavioural | — |

#### market-days/storefront-vendor-usecases

| Spec | Tests | Score | Verdict | Coupling findings |
|---|---:|:---:|---|---|
| `market-days/edit-storefront-information/edit-storefront-information.spec.ts` | 6 | 4 | mostly-behavioural | 1 (L) |
| `market-days/set-storefront-cover-photo/set-storefront-cover-photo.spec.ts` | 5 | 4 | mostly-behavioural | 1 (L) |
| `market-days/open-storefront/open-storefront.spec.ts` | 3 | 5 | behavioural | — |
| `market-days/opens-storefronts/opens-storefronts.spec.ts` | 1 | 5 | behavioural | — |
| `market-days/register-market-schedule/register-market-schedule.spec.ts` | 17 | 5 | behavioural | — |
| `market-days/register-vendor/register-vendor.spec.ts` | 5 | 5 | behavioural | — |

#### market-days/views-and-pii

| Spec | Tests | Score | Verdict | Coupling findings |
|---|---:|:---:|---|---|
| `market-days/postgres/transactional-projection.container.spec.ts` | 4 | 4 | mostly-behavioural | 1 (M) |
| `market-days/vendor-pii-fields.spec.ts` | 1 | 4 | mostly-behavioural | 1 (L) |
| `market-days/catalogue-view/catalogue-view.spec.ts` | 4 | 5 | behavioural | — |
| `market-days/in-memory-vendor-storefront-views.contract.spec.ts` | 8 | 5 | behavioural | — |
| `market-days/postgres/postgres-vendor-storefront-views.container.spec.ts` | 8 | 5 | behavioural | — |
| `market-days/vendor-storefront-view/vendor-storefront-view.spec.ts` | 3 | 5 | behavioural | — |

#### api/tracing-and-subscriptions

| Spec | Tests | Score | Verdict | Coupling findings |
|---|---:|:---:|---|---|
| `api/src/app/event-sourcing/command-dispatch-tracing.spec.ts` | 6 | 4 | behavioural | 1 (L) |
| `api/src/app/event-sourcing/postgres-notifications-tracing.spec.ts` | 6 | 4 | behavioural | 2 (LL) |
| `api/src/app/event-sourcing/subscriptions.spec.ts` | 10 | 4 | behavioural | 1 (L) |
| `api/src/app/event-sourcing/master-key.spec.ts` | 2 | 5 | behavioural | — |
| `api/src/app/event-sourcing/query-dispatch-tracing.spec.ts` | 2 | 5 | behavioural | — |
| `api/src/app/event-sourcing/storefront-consumer-tracing.spec.ts` | 1 | 5 | behavioural | — |
| `api/src/app/event-sourcing/tracing.event-handler.spec.ts` | 5 | 5 | behavioural | — |

#### api/market-days-http

| Spec | Tests | Score | Verdict | Coupling findings |
|---|---:|:---:|---|---|
| `api/src/app/market-days/storefront-cover-photo-signature.spec.ts` | 1 | 4 | mostly-behavioural | 1 (L) |
| `api/src/app/market-days/storefront-rebuild.spec.ts` | 1 | 4 | mostly-behavioural | 1 (L) |
| `api/src/app/market-days/vendor-erasure.spec.ts` | 1 | 4 | mostly-behavioural | 1 (L) |
| `api/src/app/market-days/storefront-cover-photo.spec.ts` | 1 | 5 | behavioural | — |
| `api/src/app/market-days/storefront-edit.spec.ts` | 1 | 5 | behavioural | — |
| `api/src/app/market-days/storefront-opener.spec.ts` | 2 | 5 | behavioural | — |
| `api/src/app/market-days/storefront-projection.spec.ts` | 1 | 5 | behavioural | — |
| `api/src/app/market-days/storefront-view.spec.ts` | 2 | 5 | behavioural | — |
| `api/src/app/market-days/vendor-registration.spec.ts` | 1 | 5 | behavioural | — |

#### api/misc

| Spec | Tests | Score | Verdict | Coupling findings |
|---|---:|:---:|---|---|
| `api/src/app/token-verifier.factory.spec.ts` | 2 | 3 | mixed | 2 (LM) |
| `api/src/app/message-context/message-context.spec.ts` | 1 | 5 | behavioural | — |
| `api/src/app/signed-uploads/cloudinary-signature.spec.ts` | 2 | 5 | behavioural | — |
| `api/src/app/signed-uploads/cloudinary-signed-uploads.spec.ts` | 3 | 5 | behavioural | 1 (L) |

#### frontend/onboarding-storefront

| Spec | Tests | Score | Verdict | Coupling findings |
|---|---:|:---:|---|---|
| `vendor-frontend/src/app/onboarding/storefront-form.spec.ts` | 11 | 4 | mostly-behavioural | 2 (LL) |
| `vendor-frontend/src/app/storefront/cloudinary.photo-uploads.spec.ts` | 1 | 4 | mostly-behavioural | — |
| `vendor-frontend/src/app/vendor/vendor.spec.ts` | 4 | 4 | mostly-behavioural | — |
| `vendor-frontend/src/app/onboarding/onboarding.launch.spec.ts` | 7 | 5 | behavioural | — |
| `vendor-frontend/src/app/onboarding/welcome.spec.ts` | 1 | 5 | behavioural | — |
| `vendor-frontend/src/app/storefront/storefront.spec.ts` | 11 | 5 | behavioural | — |

#### frontend/core-and-pages

| Spec | Tests | Score | Verdict | Coupling findings |
|---|---:|:---:|---|---|
| `customer-frontend/src/app/app.spec.ts` | 1 | 2 | mixed | 1 (L) |
| `admin-frontend/src/app/app.spec.ts` | 1 | 3 | mixed | — |
| `vendor-frontend/src/app/dashboard/dashboard.spec.ts` | 2 | 4 | behavioural | 1 (L) |
| `vendor-frontend/src/app/app.spec.ts` | 3 | 5 | behavioural | — |
| `vendor-frontend/src/app/core/auth/authenticated.guard.spec.ts` | 1 | 5 | behavioural | — |
| `vendor-frontend/src/app/core/cloudinary-url.pipe.spec.ts` | 2 | 5 | behavioural | — |
| `vendor-frontend/src/app/core/layout.spec.ts` | 4 | 5 | behavioural | — |
| `vendor-frontend/src/app/landing/landing.spec.ts` | 7 | 5 | behavioural | — |

---

## 3.1 Medium-severity coupling findings (5)

These are the highest-value coupling fixes. None are correctness bugs; each is a
test that would break under a refactor that preserves behaviour.

1. **`event-sourcing/shredding.event-store.spec.ts:111`** — the tamper-detection
   test rebuilds a corrupted ciphertext by splitting the stored value on `:`
   into `[prefix, version, iv, tag, ct]`, base64-decoding, flipping a byte, and
   re-serializing with the `enc:v1:` prefix. This hard-codes the exact 5-part
   AES-GCM envelope layout.
   **Fix:** corrupt the stored ciphertext structure-blind (mutate the last
   character / append junk) and assert `store.load(...)` rejects — still proves
   GCM auth rejects tampering without encoding the envelope's field layout.

2. **`event-sourcing/postgres/postgres-notifications.container.spec.ts:138`** —
   fault injection finds the adapter's backend by matching the literal SQL
   `query = 'LISTEN events'` in `pg_stat_activity`. If the adapter quoted the
   channel or renamed it, the injection would silently match nothing and the
   reconnect tests would **stop testing reconnection** while still passing green.
   **Fix:** connect the notifications client with a distinctive
   `application_name` and terminate backends by that, or expose a test seam to
   drop the connection — inject the real fault without knowing the LISTEN text.

3. **`event-sourcing/postgres/schema.container.spec.ts:22`** — asserts the exact
   presence and names of the `events` / `checkpoints` tables via
   `information_schema`. This tests physical schema shape, duplicates what the
   store/checkpoint contracts already prove by using the schema, and breaks under
   any behaviour-preserving migration (partitioning, view-backing, rename).
   **Fix:** drop the structural assertion (the contracts already prove the schema
   works), or replace with a behavioural smoke check (`append` then `load`
   succeeds).

4. **`market-days/postgres/transactional-projection.container.spec.ts:90`** — the
   rebuild↔checkpoint-reset tests reconstruct the operation inline as
   `uow.transaction(() => { projection.reset(); checkpoint.write(0); })` instead
   of driving the real `Subscriptions.rebuild`. If production stopped composing
   that transaction, the test would still pass because it hand-builds the correct
   shape itself (the file's own comment acknowledges this).
   **Fix:** invoke the real `rebuild()` path and assert the atomic outcomes
   (view cleared + checkpoint reset on success; both preserved on failure).

5. **`apps/api/.../token-verifier.factory.spec.ts:36`** — the production-env test
   asserts **only** `toBeInstanceOf(Auth0TokenVerifier)` with no behavioural
   assertion; wrapping or renaming the class breaks it though selection behaviour
   is unchanged.
   **Fix:** assert observable behaviour — the non-dev verifier rejects an
   arbitrary token (unlike the dev fake), or that it was configured with its
   issuer/audience.

## 3.2 Low-severity findings (23) — themes

Individually minor; most are one-line edits. They cluster into recurring themes:

- **Crypto envelope / byte-length pinning** — asserting the `enc:v1:` prefix or
  exact wrapped-key byte length (`shredding.event-store:32`,
  `vendor-pii-fields:34`, `postgres-data-keys.container:34`). Prefer
  `not.toBe(plaintext)` + a decrypt round-trip over pinning the wire format.
- **Error-message / log-string matching** — `schema.container:32` (`/append-only/`),
  `postgres-notifications-tracing:110` (`'LISTEN connected'` etc.). Assert the
  reject/route (log vs error channel), not the sentence.
- **Class-identity assertions** — `token-verifier.factory:22` (dev branch),
  `command-dispatch-tracing:132` (overriding the concrete inner store). Rely on
  the behavioural assertion that already follows.
- **Hand-seeded internal stream ids** — `edit-storefront-information:90` and
  `set-storefront-cover-photo:80` seed raw envelopes at the literal
  `'storefront-vendor-id'`, coupling to stream-id derivation. Arrange the
  precondition through the public handler or a shared helper.
- **Exact Cloudinary transform strings in frontend/API** —
  `storefront-form:114`, `dashboard.spec`, `cloudinary-signed-uploads:23`,
  `storefront-cover-photo-signature:27`. Assert the load-bearing part (public id,
  cloud host, `f_webp` presence) not the full recipe.
- **DOM structural selectors** — `storefront-form:16` finds the file input via
  `querySelector('input[type="file"]')` instead of `getByLabelText`. The only
  frontend spot that departs from the role/label convention used everywhere else.
- **Positional / exact-schedule assertions** — `plan-items-for-market-day:52`
  (`items[1]` by index), `subscriptions:213` (exact 1500ms/1000ms backoff).
  Assert by id / the monotonic property instead of the incidental position/value.

Several low findings were judged **acceptable as-is** by the audit (e.g.
`auth.integration` recording a boundary fake's interaction log;
`in-memory-data-keys` pinning the 32-byte AES-256 contract;
`storefront-rebuild` seeding an orphan row that can only exist via direct write)
— they read as intentional and are noted for context, not flagged for change.

## 3.3 The two thin tests

- **`customer-frontend/src/app/app.spec.ts` (score 2)** — the sole assertion is
  `expect(App).toBeDefined()`: it compiles the component in `beforeEach` but then
  only checks the class symbol exists. It can never fail for a behavioural reason
  (TypeScript already catches an import error).
  **Fix:** render the component and assert a user-visible landmark (`getByRole`
  for the primary heading/nav), matching the admin smoke test at minimum.
- **`admin-frontend/src/app/app.spec.ts` (score 3)** — renders and asserts
  `componentInstance` is defined. Not coupled to internals, but asserts no
  user-visible behaviour. Consider asserting a rendered landmark.

---

## 4. Coverage overlap

The suite is **deliberately layered**: value-object → domain use-case → port
contract → Postgres container → API HTTP → frontend component/service. Most
overlap is intentional and correct for an event-sourced / hexagonal
architecture — the same flow is legitimately verified at different layers, each
catching a different class of regression. The map below separates **genuinely
wasteful** repetition from **intentional layering** (which is called out so it's
documented, not removed).

### 4.1 DRY opportunity — *not* dead coverage

**`stamps vendor id into event metadata` — 11 files** *(overlap type:
partial · this was initially over-classified as a removable "redundant
duplicate"; see the note below)*

The identical assertion (via the shared `expectVendorScopedEvents` helper) that
an aggregate's events carry `{ vendorId }` in metadata is hand-repeated across 11
use-case specs: `add-item-to-catalogue`, `change-item-price`,
`mark-item-as-sold-out`, `plan-items-for-market-day`,
`unplan-item-from-market-day`, `retire-item`, `open-storefront`,
`edit-storefront-information`, `set-storefront-cover-photo`, `register-vendor`,
`register-market-schedule`.

Mechanically, all 11 stamp through **one shared mechanism** —
`VendorScopedEvents.save()` writes `{ vendorId }` for every event — and each spec
wires `new VendorScopedEvents(store)` and asserts identically. That single shared
code path is what made this look like pure repetition.

**Why it is *not* pure redundancy.** There are two ways stamping can regress, and
the per-command tests are only redundant for one of them:

- **A — `VendorScopedEvents.save()` stops stamping.** All 11 fail together; one
  test would catch it. *This* is the redundant part.
- **B — a single command is refactored to bypass `VendorScopedEvents`** (appends
  to the store directly, or a new repository that doesn't wrap it). **Only that
  command's own test catches it.** This is a real per-event behaviour, not
  plumbing — losing it means a handler could silently stop stamping while the
  suite stays green.

**Recommendation (revised).** Treat this as a DRY cleanup, not a coverage cut. If
you consolidate, do it as a **parameterized test that drives every real command
handler** (each command is a case) — this keeps failure-mode **B** intact while
removing the copy-paste, and has the useful side-effect that adding a new
vendor-scoped command forces a new case. Do **not** replace the per-command
checks with a single isolated `VendorScopedEvents` unit test or a
dispatcher-level test — that form only covers **A** and drops exactly the
per-handler protection you want. Keeping the 11 blocks as-is is also a legitimate
choice: each use-case spec stays self-contained and states its own vendor-scoping
guarantee. Net win from consolidating is readability/DRY (11 near-identical
three-line blocks → one table), **not** confidence.

### 4.2 Partial overlap — trim or centralize

| Theme | Files | Recommendation |
|---|---|---|
| **Tracing: payload-blind span + records-exception** *(med)* | `command-dispatch-tracing`, `query-dispatch-tracing`, `tracing.event-handler`, `storefront-consumer-tracing` | Extract the blind-span + records-exception invariants into **one shared tracing-wrapper contract**; each spec asserts only its span name + unique attributes. `storefront-consumer-tracing` shrinks to a "handler is wrapped at all" smoke test. |
| **Correlation/causation propagation** *(med)* | `event-sourcing/message-context`, `api/message-context`, `command-dispatch-tracing`, `vendor-registration`, `storefront-opener` | Keep the core unit + **one** end-to-end propagation test as canonical. In the per-flow specs keep only the flow-specific causation edge (e.g. opened caused-by registered); drop generic "stamps correlation/causation". |
| **Frontend cover-photo upload flow** *(med)* | `storefront-form`, `storefront`, `cloudinary.photo-uploads` | Layering is defensible (primitive/service/component). Keep the raw POST in `cloudinary.photo-uploads`, orchestration in `storefront` (service); in `storefront-form` keep only component concerns (uploading state, size validation, error surfacing) and stub the service. |
| **Storefront projection / view read model** *(low)* | `vendor-storefront-view`, `storefront-projection`, `storefront-view` | Keep the API split (projection = write/polling; view = read/404). Trim the domain `vendor-storefront-view` overlap so it proves only projection event-handling. |
| **Cloudinary signing primitive** *(low)* | `cloudinary-signature`, `cloudinary-signed-uploads`, `storefront-cover-photo-signature` | Keep `cover-photo-signature` on vendor-scoping + event wiring; rely on `cloudinary-signed-uploads` for "signature covers exactly the params". |
| **Frontend auth-status → UI + guard** *(low)* | `app`, `authenticated.guard`, `layout`, `landing` | Extract one shared "auth-visibility" helper for the pending/authenticated/anonymous button rule reused by `layout` + `landing`. Keep guard logic in `authenticated.guard`; `app.spec` asserts the integrated bounce as a smoke test only. |
| **VO rejection re-tested inside use-cases** *(low)* | `image-reference`, `local-time`, `add-item-to-catalogue`, `plan-items-for-market-day`, `register-market-schedule` | Keep one rejection assertion per VO in the VO spec; use-case specs assert only that the command surfaces a failure for one representative invalid field — not the full validity matrix the VO already owns. |

### 4.3 Layered-intentional — keep, but documented

These are the "one contract, N adapters / N layers" cases. They are **correct**,
but two carry a **drift risk** worth removing, and container specs can be
narrowed to their layer's marginal risk.

| Theme | Files | Note |
|---|---|---|
| **Event-store port contract** *(med — drift)* | `in-memory-event-store.contract`, `message-context.event-store.contract` | Both assert the **same 17 behaviours verbatim**. Keep the reuse but drive both from a **single shared contract factory** (avoid hand-copied drift); narrow the message-context spec to what the wrapper *adds* (correlation/causation). |
| **Vendor storefront views contract** *(med — drift)* | `in-memory-vendor-storefront-views.contract`, `postgres-vendor-storefront-views.container`, `vendor-storefront-view` | Identical **8-behaviour** set across in-memory + Postgres — enforce a single source. Keep the Postgres run (real SQL/transaction semantics); trim the domain spec to projection-wiring only. |
| **Subscription polling / dispatch** *(med)* | `polling-subscription.contract`, `postgres-subscription.container`, `api/subscriptions` | In-memory contract owns dispatch/checkpoint semantics. **Trim the Postgres container to Postgres-only risk** (LISTEN/NOTIFY wakeup, real checkpoint persistence); delete re-asserted ordering/redelivery. `api/subscriptions` keeps orchestration (backoff, drain). |
| **Rebuild clears read model + replays** *(med)* | `api/subscriptions`, `storefront-rebuild`, `transactional-projection.container` | Keep the generic mechanic in `subscriptions`, atomicity in the container spec; narrow `storefront-rebuild` to storefront-specific outcomes (orphan-row removal, final content). |
| **PII encrypt-at-rest / shred** *(med)* | `shredding.event-store`, `vendor-pii-fields`, `vendor-erasure` | `shredding.event-store` owns encrypt/decrypt/tamper mechanics. **Reduce `vendor-pii-fields` to a PII-field-registry check** (which fields are registered). Keep `vendor-erasure` — the erase→rebuild→SHREDDED flow is genuinely distinct. |
| **Vendor registration → storefront open flow** *(med)* | `register-vendor`, `opens-storefronts`, `open-storefront`, `api/vendor-registration`, `api/storefront-opener` | Legitimate domain+API layering. Ensure API specs assert only the HTTP/read-model seam + lineage, not domain invariants (idempotency) already owned by `open-storefront`. |
| **Checkpoint read behaviour** *(low)* | `in-memory-checkpoint.contract`, `postgres-subscription.container` | Acceptable in-memory vs real-Postgres layering; if a dedicated postgres-checkpoint run exists, drop these two from the subscription container. |
| **Frontend onboarding orchestration vs units** *(med)* | `onboarding.launch`, `vendor`, `storefront`, `landing` | Keep `onboarding.launch` as the routing/integration spec; delegate error/retry mechanics to the unit specs so one owns the user-facing error surface. |

---

## 5. Suggested action list

Ordered by value-to-effort. None are urgent — the suite is healthy.

1. **Optionally DRY up the 11-file `vendorId in metadata` blocks** into one
   *parameterized* test that still drives every command handler (each a case).
   This is a readability win, not a coverage gain — keep per-handler cases so a
   single handler bypassing the shared stamping is still caught. *(low effort,
   optional — §4.1)*
2. **Make the two smoke tests real** (`customer-frontend`, `admin-frontend`
   `app.spec`) — render + assert a landmark. *(§3.3)*
3. **Reword the 5 medium coupling findings** to assert behaviour, not
   wire-format / class identity / hand-composed transactions. *(§3.1)*
4. **Introduce shared contract factories** for the event-store and
   storefront-views port contracts to kill hand-copied drift; narrow the
   Postgres/container specs to infrastructure-only risk, using
   `postgres-data-keys.container.spec.ts` as the template. *(§4.3)* —
   ✅ **partly done:** the 2026-07-12 work applied exactly this pattern to the new
   catalogue and market-schedule view contracts (see §6). The original
   event-store / storefront-views pairs are still hand-copied.
5. **Extract a tracing-wrapper contract + one correlation-propagation test;**
   thin the per-flow tracing specs to their unique attributes. *(§4.2)*
6. **Sweep the low findings** as touched: swap envelope-prefix/byte-length pins
   for `not.toBe(plaintext)` + round-trip; replace message-text matches with
   channel/reject assertions; the one `querySelector('input[type=file]')` →
   `getByLabelText`. *(§3.2)*

## 6. Re-audit — changes since the initial audit (2026-07-12)

Base: the initial audit's tree (`087d03a`). Since then **38 spec files changed**
(22 added, 16 modified) — the market-schedule feature (register/amend/cancel,
declare-absence, upcoming-days + schedule views), the catalogue feature
(revise-item, catalogue views), and their API + vendor-frontend layers. This
section re-scores those 38 against the same ADR-0006 rubric, checks whether the
initial audit's findings on the modified files were fixed, and re-maps overlap
against the full current inventory (the 38 re-audited files + prior behaviours
for the 62 unchanged files).

### 6.1 Delta verdict

**The new work holds the line.** Of the 38 changed files: **30 score 5, 8 score
4, none below 4.** 279 test cases across the delta. **Zero high-severity
coupling.** Two headline observations:

- 🟢 **The shared-contract-factory recommendation (§4.3 / action #4) was
  adopted.** The new catalogue and market-schedule view contracts
  (`catalogue-views.contract.ts`, `market-schedule-views.contract.ts`) are single
  factories that both the in-memory spec and the Postgres container spec delegate
  to in ~4 lines. Their identical behaviour lists are therefore **not**
  hand-copied duplication — zero double-maintenance cost. This is the model to
  retrofit onto the older event-store / storefront-views pairs.
- 🟡 **One new redundancy pattern appeared:** the new **API HTTP specs**
  (`market-schedule.spec`, `catalogue.spec`) re-enumerate validation/rejection
  rules that the domain use-case specs already own exhaustively. The HTTP layer
  only needs *one* representative `400` to prove error-to-HTTP mapping. Net effect
  of the batch on suite redundancy: **neutral-to-slightly-worse** — architecture
  and layering are sound, but this and the continuing `vendorId` copy add
  low-marginal-confidence duplication.

### 6.2 Prior findings on modified files — fixed vs still present

Of the modified files, 5 carried findings from the initial audit:

| File | Prior finding | Status |
|---|---|:--:|
| `dashboard.spec.ts` | exact Cloudinary transform string in `src` | ✅ **fixed** |
| `storefront-cover-photo-signature.spec.ts:27` | asserts fake's exact `signed(...)` string | ⚠️ still present |
| `storefront-form.spec.ts:16` | file input via `querySelector('input[type=file]')` | ⚠️ still present |
| `storefront-form.spec.ts:114` | hard-coded derived Cloudinary preview URL | ⚠️ still present |
| `shredding.event-store.spec.ts:32` | asserts `enc:v1:` envelope prefix at rest | ⚠️ still present |
| `shredding.event-store.spec.ts:111` | tamper test parses the 5-part envelope layout | ⚠️ still present *(medium)* |
| `vendor-pii-fields.spec.ts:34` | asserts `/^enc:v1:/` envelope prefix | ⚠️ still present |

These are all low/medium and were untouched by the feature work (expected — the
changes were feature-driven, not cleanup). They remain valid §3.1/§3.2 items.

### 6.3 Scorecard — the 38 changed files

`new` = added file · `mod` = modified file · Findings severities: `H`/`M`/`L`.

**market-days/schedule-write**

| Spec | New/Mod | Tests | Score | Findings |
|---|:--:|--:|:--:|---|
| `market-days/amend-market-schedule/amend-market-schedule.spec.ts` | new | 2 | 5 | — |
| `market-days/cancel-market-schedule/cancel-market-schedule.spec.ts` | new | 3 | 5 | — |
| `market-days/declare-absence/declare-absence.spec.ts` | new | 5 | 5 | — |
| `market-days/register-market-schedule/register-market-schedule.spec.ts` | mod | 19 | 5 | — |

**market-days/schedule-views**

| Spec | New/Mod | Tests | Score | Findings |
|---|:--:|--:|:--:|---|
| `market-days/market-schedule-view/find-upcoming-market-days.spec.ts` | new | 9 | 5 | 1 (L) |
| `market-days/market-schedule-view/find-vendor-schedules.spec.ts` | new | 3 | 5 | — |
| `market-days/market-schedule-view/in-memory-market-schedule-views.contract.spec.ts` | new | 10 | 5 | — |
| `market-days/market-schedule-view/market-schedule-view.spec.ts` | new | 5 | 5 | — |
| `market-days/postgres/postgres-market-schedule-views.container.spec.ts` | new | 10 | 5 | — |

**market-days/catalogue**

| Spec | New/Mod | Tests | Score | Findings |
|---|:--:|--:|:--:|---|
| `market-days/add-item-to-catalogue/add-item-to-catalogue.spec.ts` | mod | 13 | 5 | 1 (L) |
| `market-days/catalogue-view/catalogue-view.spec.ts` | mod | 4 | 5 | — |
| `market-days/catalogue-view/find-vendor-catalogue.spec.ts` | new | 3 | 5 | — |
| `market-days/catalogue-view/in-memory-catalogue-views.contract.spec.ts` | new | 7 | 5 | — |
| `market-days/postgres/postgres-catalogue-views.container.spec.ts` | new | 7 | 5 | — |
| `market-days/revise-item/revise-item.spec.ts` | new | 3 | 5 | — |

**api/market-days-http**

| Spec | New/Mod | Tests | Score | Findings |
|---|:--:|--:|:--:|---|
| `api/src/app/market-days/catalogue-photo-signature.spec.ts` | new | 1 | 4 | 1 (L) |
| `api/src/app/market-days/storefront-cover-photo-signature.spec.ts` | mod | 1 | 4 | 1 (L) |
| `api/src/app/market-days/catalogue.spec.ts` | new | 5 | 5 | — |
| `api/src/app/market-days/market-schedule.spec.ts` | new | 14 | 5 | 1 (L) |
| `api/src/app/market-days/storefront-cover-photo.spec.ts` | mod | 1 | 5 | — |

**frontend/catalogue**

| Spec | New/Mod | Tests | Score | Findings |
|---|:--:|--:|:--:|---|
| `vendor-frontend/src/app/catalogue/add-dish.spec.ts` | new | 11 | 4 | 4 (LLLL) |
| `vendor-frontend/src/app/catalogue/catalogue-list.spec.ts` | new | 8 | 4 | 3 (LLM) |
| `vendor-frontend/src/app/catalogue/catalogue.spec.ts` | new | 9 | 5 | — |

**frontend/markets**

| Spec | New/Mod | Tests | Score | Findings |
|---|:--:|--:|:--:|---|
| `vendor-frontend/src/app/markets/add-schedule.spec.ts` | new | 13 | 5 | — |
| `vendor-frontend/src/app/markets/market-schedule.spec.ts` | new | 12 | 5 | 1 (L) |
| `vendor-frontend/src/app/markets/markets-list.spec.ts` | new | 10 | 5 | — |

**frontend/core-onboarding-storefront**

| Spec | New/Mod | Tests | Score | Findings |
|---|:--:|--:|:--:|---|
| `vendor-frontend/src/app/onboarding/storefront-form.spec.ts` | mod | 11 | 4 | 2 (LL) |
| `vendor-frontend/src/app/storefront/cloudinary.photo-uploads.spec.ts` | mod | 1 | 4 | 1 (L) |
| `vendor-frontend/src/app/app.spec.ts` | mod | 3 | 5 | — |
| `vendor-frontend/src/app/core/auth/authenticated.guard.spec.ts` | mod | 1 | 5 | — |
| `vendor-frontend/src/app/core/layout.spec.ts` | mod | 7 | 5 | 1 (L) |
| `vendor-frontend/src/app/core/notifications/error.interceptor.spec.ts` | new | 3 | 5 | — |
| `vendor-frontend/src/app/dashboard/dashboard.spec.ts` | mod | 11 | 5 | 1 (L) |
| `vendor-frontend/src/app/onboarding/onboarding.launch.spec.ts` | mod | 7 | 5 | 1 (L) |
| `vendor-frontend/src/app/storefront/storefront.spec.ts` | mod | 12 | 5 | 1 (L) |

**domain/misc-modified**

| Spec | New/Mod | Tests | Score | Findings |
|---|:--:|--:|:--:|---|
| `event-sourcing/shredding.event-store.spec.ts` | mod | 10 | 4 | 2 (LM) |
| `market-days/vendor-pii-fields.spec.ts` | mod | 1 | 4 | 1 (L) |
| `common/local-date.spec.ts` | mod | 24 | 5 | — |

### 6.4 New findings in the delta

**Medium (2):**

1. **`shredding.event-store.spec.ts:111`** — the tamper-detection test still
   reconstructs a corrupted ciphertext by splitting the stored envelope on `:`
   into `[prefix,version,iv,tag,ct]`. Same medium finding as the initial audit,
   carried forward. **Fix:** corrupt the stored value opaquely (mutate its last
   character) rather than parsing its structure.
2. **`vendor-frontend/src/app/catalogue/catalogue-list.spec.ts:70`** — the
   no-photo placeholder is asserted via the Font Awesome class selector
   `.fa-camera`, coupling to the icon library. The icon is `aria-hidden` by
   design, so assert the behavioural contract instead: **no dish `<img>` is
   rendered** (`queryByAltText`/`queryByRole('img')` is null).

**Low themes (21)** — the delta repeats the suite's existing low-finding shapes,
concentrated in the new frontend-catalogue specs:

- **Exact Cloudinary transform strings** in `add-dish:79`, `catalogue-list:60`
  (and the carried-over `storefront-form:114`, `dashboard` now fixed). Assert
  `stringContaining` the public id; let `cloudinary-url.pipe.spec` own the recipe.
- **DOM structural selectors** — `add-dish:17,38` reach the hidden file input via
  `input[type=file]` / raw `capture`/`accept` attributes. Largely unavoidable for
  a hidden input, but prefer driving via the visible button where possible.
- **"Was-called" boolean flags on port fakes** — `add-dish:32` and
  `catalogue-list:29` assert a fake's `began`/`loaded` boolean rather than an
  observable outcome. Acceptable as boundary-command checks, but `add-dish:32`'s
  test name over-promises ("clearing leftover photo state") vs what it asserts.
- **Exact occurrence-window counts** — `find-upcoming-market-days` and
  `market-schedule.spec:135` pin exact date-list lengths that encode the private
  `HORIZON_DAYS=56`. Judged **acceptable** (the window *is* the meaning of
  "upcoming"), but could assert the property (all dates within `[today, +horizon]`)
  instead of the exact list.
- **Exact fake signature string** — `catalogue-photo-signature:28` mirrors the
  existing `storefront-cover-photo-signature:27` finding.

### 6.5 Overlap introduced by the delta

New / changed overlap clusters (8 involve changed files; full-suite total is now
24):

| Theme | Type | Files | Recommendation |
|---|---|---|---|
| **API HTTP specs re-enumerate domain validation rules** *(NEW pattern, med)* | partial | `api/market-schedule.spec`, `api/catalogue.spec` vs domain `register-market-schedule`/`declare-absence`/`cancel`/`add-item-to-catalogue` | Reduce each API spec to **one representative `400`** proving error-to-HTTP mapping; delete the per-rule re-checks. The exhaustive matrix stays in the domain use-case specs. |
| **`vendorId in metadata` stamp** *(continuing, low)* | redundant-duplicate | now ~13 specs incl. new `revise-item`, `register-market-schedule` | Same guidance as §4.1 — optional parameterized consolidation, keep each handler a case. The three new copies extend the existing pattern. |
| **Frontend list re-tests Cloudinary URL primitive** *(low)* | partial | `catalogue-list.spec` vs `cloudinary-url.pipe.spec` | Weaken the list assertion to "image rendered with the item's public id"; let the pipe spec own the exact URL. |
| **Catalogue read model at 4 layers** *(low)* | layered-intentional | contract / `catalogue-view` projection / `find-vendor-catalogue` query / `api/catalogue` | Keep the layering; trim `catalogue-view.spec` to "projection reacts to each event type" and lean on the contract for exhaustive shape/scoping. |
| **Market-schedule read model at 4 layers** *(low)* | layered-intentional | contract / `market-schedule-view` / `find-vendor-schedules` / `find-upcoming-market-days` / `api/market-schedule` | Keep `find-upcoming-market-days` (unique domain logic) untouched; drop the empty/scoping cases in `find-vendor-schedules` already owned by the contract. |
| **Catalogue & market-schedule view contracts** *(WIN)* | layered-intentional | in-memory + Postgres container specs delegating to shared factories | **No action** — the shared-contract-factory pattern is correctly applied; identical behaviour lists carry no maintenance cost. |

### 6.6 Delta action list

1. **Trim the new API validation re-enumeration** (`market-schedule.spec`,
   `catalogue.spec`) to one representative `400` each. *(highest-value new item —
   §6.5)*
2. **Fix the one new medium** — `catalogue-list:70` `.fa-camera` → assert no
   `<img>` rendered. *(§6.4)*
3. When touching `shredding.event-store.spec`, address the carried-over medium
   tamper-envelope finding. *(§6.2)*
4. Sweep the new low findings (Cloudinary transform strings, file-input
   selectors) alongside the existing §3.2 sweep — same fixes.
5. **Retrofit the older event-store / storefront-views contract pairs** onto the
   now-proven factory pattern used by the new view contracts. *(§6.1)*

---


*Appendix — method:* the initial audit used 14 analysis agents (one per cohesive
test cluster) scoring every file against ADR 0006 and emitting a normalized
behaviour inventory, then a synthesis pass over the full inventory for overlap.
The 2026-07-12 re-audit (§6) used the same harness scoped to the 38 changed
files — 8 analysis agents plus a delta-overlap pass run against the full current
inventory (re-audited files + prior behaviours for unchanged files), and also
re-checked each prior finding on the modified files for fixed/still-present
status. Scores and findings reflect that automated audit and are a starting point
for review, not a substitute for team judgement on intentional layering.
