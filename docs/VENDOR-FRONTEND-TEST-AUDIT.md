# vendor-frontend test audit — low-value, redundant & non-behavioural tests

Date: 2026-07-25 · Scope: all 22 spec files (176 test cases) in
`apps/vendor-frontend`. Baseline: whole suite green, 97.2% statement coverage.

Rubric: [ADR 0006 — Outside-in TDD with fakes at boundaries](adr/0006-outside-in-tdd-with-fakes.md).
Recording an interaction on a boundary fake (`fake.loaded`, `fake.loggedIn`) is
**correct** here and is not counted as a finding on its own.

This is a follow-up to the repo-wide [`TEST_AUDIT.md`](TEST_AUDIT.md) (2026-07-09),
narrowed to vendor-frontend and re-verified. Findings 1–3 were **proved by
mutating the production code and re-running the suite**, not by reading alone.

---

## Summary

The suite is in good shape and overwhelmingly behavioural — it queries by
role/label, drives components through `Fake*Facade` boundaries, and asserts on
what the vendor can see. Nine specs (`add-schedule`, `catalogue`,
`market-schedule`, `dev-auth.interceptor`, `error.interceptor`,
`onboarding.launch`, the two edit guards, `dashboard`) are strong and need no
change.

| Tier | Finding | Count |
|---|---|---:|
| 1 | Vacuous — cannot fail for a behavioural reason | 3 |
| 2 | Redundant — strictly subsumed by a neighbour | 3 |
| 3 | Non-behavioural coupling — worth rewording | 3 themes |

**Structural note:** `stryker.conf.mjs` mutates `packages/**` only. The frontend
gets no mutation coverage, which is exactly why the tier-1 findings below survive
at 97% line coverage. Line coverage proves code *ran*, not that anything
*asserted* on it.

---

## Tier 1 — Vacuous assertions

### 1.1 `catalogue-list.spec.ts:97` — the camera-placeholder assertion can never fail

```ts
expect(view.container.querySelector('.fa-camera')).not.toBeNull();
```

`CatalogueList` renders `<i class="fa-solid fa-camera">` unconditionally inside
the "Ajouter un plat" card, which sits **above** the dish list in the DOM. So
`querySelector('.fa-camera')` always matches that icon, whatever the dish
renders.

**Proved:** deleting the entire `@else` placeholder block from
`catalogue-list.ts` leaves all 176 tests passing.

The first assertion in the test (`queryByAltText(...)` is null) does carry
weight; only the second is dead.

**Fix:** scope the query to the dish — `within(screen.getByRole('link', { name:
/bœuf bourguignon/i }))` — or give the placeholder an accessible name and query
by role. Avoid asserting on a FontAwesome class either way; it breaks under an
icon-library swap that preserves behaviour.

### 1.2 `add-dish.spec.ts:30` — the named behaviour is asserted nowhere

```ts
it('starts a fresh dish, clearing any leftover photo state', async () => {
  const { catalogue } = await renderForm();
  expect(catalogue.began).toBe(true);
});
```

The assertion covers only "a facade method was called". The behaviour in the
title — the `BeginDish` reducer resetting `photoUploading`, `photoError` and
`newPhotoReference` (`catalogue.state.ts:54`) — is never asserted. It is not
covered by `catalogue.spec.ts` either: the "clears the staged photo" test there
exercises `AddDish`, a different action.

**Proved:** replacing the `BeginDish` reducer with `(state) => state` leaves all
176 tests passing.

**Fix:** keep the call assertion if you want the wiring pinned, but add the real
one to `catalogue.spec.ts` — fail an upload, dispatch `BeginDish`, assert the
three signals reset. This is a genuine coverage gap, not just a weak test.

### 1.3 `app.spec.ts:57` — `it('smoke')`

```ts
expect(_view.fixture.componentInstance).toBeTruthy();
```

The `beforeEach` already renders `App`, navigates to `/` and detects changes; any
failure there throws before the assertion is reached. The assertion adds nothing
a rendering failure would not already report. This is the same score-2 pattern
`TEST_AUDIT.md` §3.3 flagged in `customer-frontend`/`admin-frontend`.

**Fix:** delete it — the file's two real tests (logout→login, anonymous bounce)
already prove the app boots — or assert a user-visible landmark instead.

---

## Tier 2 — Redundant

### 2.1 `catalogue-list.spec.ts:124` and `markets-list.spec.ts:122` — "shows only the add-X affordance"

Both render the same empty state as the two tests immediately preceding them and
assert a **strictly weaker** version of the same two facts: existence of the
add-card and back links, where the neighbours already assert their `href`s. The
name promises exclusivity ("shows **only**") but nothing asserts that no dish or
schedule cards render.

**Fix:** delete, or make it earn its name — assert `queryAllByRole('link')`
contains no `/edit` hrefs.

### 2.2 `storefront.spec.ts:90` — "reports a storefront the server calls published as published"

`exposes the view once loaded` already asserts `toEqual(ACME)` over the whole
object, including `published: false`. `HttpStorefront.view()` is an untransformed
`http.get` pass-through with no mapping layer, and the reducer stores the body
verbatim — there is no code path that could drop the field. Meanwhile
`marks the loaded storefront published on success` covers the flag flipping to
`true` through real behaviour.

This test only re-verifies that HttpClient and an NgRx reducer copy a boolean.

**Fix:** delete. (Note the sibling `requests the storefront view when asked to
load` looks similarly thin but is **not** redundant — verified by mutating
`view()` from GET to POST, which fails that test and only that test. It is the
sole assertion of the HTTP verb, since `expectOne(url)` matches by URL. Keep it,
and its equivalents in `catalogue.spec` and `market-schedule.spec`.)

---

## Tier 3 — Non-behavioural coupling

### 3.1 Element-id selectors in the edit guards

`editable-dish.guard.spec.ts:49,65` and `editable-schedule.guard.spec.ts:50,66`
use `form.querySelector('#name')`, and `:48` / `:49` use
`form.textContent).toContain('Modifier le plat')`. Both couple to markup detail
that a behaviour-preserving refactor would break, and both depart from the
role/label convention used everywhere else in the suite.

**Fix:** `getByLabelText(/nom du plat/i)` / `(/nom du marché/i)` and `getByText`.

### 3.2 `querySelector('input[type="file"]')` has spread

`storefront-form.spec.ts:16` was flagged in `TEST_AUDIT.md` §3.2 as the suite's
only departure from the role/label convention. It has since been copied into
`add-dish.spec.ts:17` and `:37`.

`add-dish.spec.ts:35` (`offers to take a photo of the camera`) additionally
asserts raw `capture` / `accept` attributes. That one is defensible — jsdom can't
observe a camera opening, and the attribute *is* the user-facing capability — but
it should at least locate the input by label.

**Fix:** `getByLabelText` in the `selectFile` helpers; keep the attribute
assertions.

### 3.3 `vendor.spec.ts:40,47,56` — three tests over dead state

Three of the file's four tests assert `VendorFacade.loading()`. Grepping every
template and TS file in the app: **nothing consumes `VendorFacade.loading`**. It
is a signal with no reader, so the tests pass regardless of what the vendor sees
during registration — there is no registration spinner today.

**Fix:** either surface the flag in the UI and test through what renders, or drop
the signal along with the three tests, keeping `should register vendor when login
succeeds`.

---

## Not findings (noted so they aren't re-flagged)

- **Interaction assertions on boundary fakes** — `fake.loaded`, `.loggedIn`,
  `.loggedOut`, `.publishCalled`, `.dismissed`, `.retried`. Sanctioned by
  ADR 0006. The one exception is `.began` (§1.2), where nothing else covers the
  effect.
- **`landing` / `layout` auth-visibility overlap** — same rule shape, different
  components and different buttons; each component owns its own rendering.
  `TEST_AUDIT.md` §4.2 suggests a shared helper; that's a DRY preference, not
  redundancy.
- **`landing` vs `onboarding.launch` error-code surfacing** — deliberate
  component/integration layering, consistent with the rest of the repo.
- **`dashboard.spec` `loads the catalogue/schedules on arrival`** — two one-line
  tests that could be one. Cosmetic.

---

## Suggested order of work

1. Fix `catalogue-list.spec:97` and add the missing `BeginDish` reset test to
   `catalogue.spec` — these are real gaps, not tidying. *(§1.1, §1.2)*
2. Delete `app.spec` `smoke`, the two "shows only the add-X affordance" tests and
   `storefront.spec:90`. *(§1.3, §2.1, §2.2)*
3. Decide `VendorFacade.loading`'s fate — surface it or delete it. *(§3.3)*
4. Sweep the `querySelector` uses to label queries as those files are touched.
   *(§3.1, §3.2)*
5. Consider extending `stryker.conf.mjs` to `apps/vendor-frontend/src/**` — the
   two tier-1 findings are precisely what mutation testing surfaces and line
   coverage cannot.
