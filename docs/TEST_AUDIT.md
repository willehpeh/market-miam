# Test Suite Audit — behaviour, implementation coupling & overlap

Date: 2026-07-09 · Scope: all 78 spec files (403 test cases) across `apps/*`,
`packages/*` and the shared `test/` package.

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

| Metric | Result |
|---|---|
| Spec files audited | 78 |
| Test cases | 403 |
| Score 5 (purely behavioural, refactor-proof) | **56 files (72%)** |
| Score 4 (behavioural, minor over-specification) | 18 files (23%) |
| Score 3 (mixed) | 3 files |
| Score 2 (a near no-op assertion) | 1 file |
| Verdict: behavioural / mostly-behavioural | 74 files (95%) |
| Coupling findings total | 28 (0 high · 5 medium · 23 low) |
| Files with ≥1 finding | 23 |
| Overlap clusters identified | 16 (8 partial · 8 layered-intentional; 0 removable duplicates) |

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
   `postgres-data-keys.container.spec.ts` as the template. *(§4.3)*
5. **Extract a tracing-wrapper contract + one correlation-propagation test;**
   thin the per-flow tracing specs to their unique attributes. *(§4.2)*
6. **Sweep the low findings** as touched: swap envelope-prefix/byte-length pins
   for `not.toBe(plaintext)` + round-trip; replace message-text matches with
   channel/reject assertions; the one `querySelector('input[type=file]')` →
   `getByLabelText`. *(§3.2)*

---

*Appendix — method:* 14 analysis agents (one per cohesive test cluster) scored
every file against ADR 0006 and emitted a normalized behaviour inventory; a
synthesis pass cross-referenced the full inventory for overlap. Scores and
findings reflect that automated audit and are a starting point for review, not a
substitute for team judgement on intentional layering.
