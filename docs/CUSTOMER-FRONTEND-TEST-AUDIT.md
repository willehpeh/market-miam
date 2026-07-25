# customer-frontend test audit — low-value, redundant & non-behavioural tests

Date: 2026-07-25 · Scope: all 5 spec files (23 test cases) in
`apps/customer-frontend`. Baseline: whole suite green, 95.2% statements /
84.9% branches.

Rubric: [ADR 0006 — Outside-in TDD with fakes at boundaries](adr/0006-outside-in-tdd-with-fakes.md).
Companion to [`VENDOR-FRONTEND-TEST-AUDIT.md`](VENDOR-FRONTEND-TEST-AUDIT.md)
and the repo-wide [`TEST_AUDIT.md`](TEST_AUDIT.md). Findings marked **Proved**
were verified by mutating production code and re-running the suite, not by
reading alone.

---

## Summary

Three of the five specs are genuinely good. `storefront-metadata.spec.ts` is the
best test file in either frontend — five behavioural cases over title / `og:` /
`twitter:` tags, including the no-cover and not-found fallbacks.
`storefront.resolver.spec.ts` is close behind, and its SSR proxy-host case
(`derives the subdomain from request.url`, with a comment explaining the Render
forwarding behaviour) is exactly the kind of test that earns its keep.
`storefront-view-model.spec.ts` covers the variant path the resolver spec
doesn't — complementary, not redundant.

**The problem in this app is not weak tests so much as missing seams.** Every
unit is tested; almost nothing tests that the units are connected. Three
separate wirings can be deleted outright with the suite staying green — one of
them the app's entire reason for being server-rendered.

| Tier | Finding | Count |
|---|---|---:|
| 1 | Vacuous — cannot fail for a behavioural reason | 1 |
| 2 | Untested seams — deletable wiring, suite stays green | 5 |
| 3 | Non-behavioural assertion style | 1 file-wide theme |

Unlike vendor-frontend, this project's `test` target has no `coverage` option
configured in `project.json` — coverage has to be asked for with `--coverage`,
so the gaps below are invisible in normal runs and in CI.

---

## Tier 1 — Vacuous

### 1.1 `app.spec.ts:11` — `it('smoke')`

```ts
expect(App).toBeDefined();
```

TypeScript already guarantees the import resolves, so the assertion cannot fail
for a behavioural reason. The `compileComponents()` in `beforeEach` does earn
something — it catches a template compile error — but `App` is never rendered
(`app.html` sits at **0% coverage**), and this file occupies the slot where the
routing test should live (§2.2).

`TEST_AUDIT.md` §3.3 flagged this file at score 2 on 2026-07-09 with the same
recommendation; it is still unfixed.

**Fix:** replace with a rendering test that covers §2.2 — mount `App` over
`appRoutes` with a stubbed resolver and assert the storefront page appears.

---

## Tier 2 — Untested seams

### 2.1 Nothing asserts the page ever sets metadata *(highest severity)*

`StorefrontMetadata` is thoroughly tested in isolation. Nothing proves
`StorefrontPage.ngOnInit` calls it.

**Proved:** emptying `ngOnInit` in `storefront-page.ts` — so no title, no `og:`
tag, no `twitter:` card is ever set — leaves **all 23 tests green**.

This app is server-rendered *specifically* so shared links render rich cards
([ADR 0019](adr/0019-ssr-customer-frontend-only.md)). The service is well
covered; the one line that makes it matter is not.

**Fix:** in `storefront-page.spec`, provide a fake/spy `StorefrontMetadata` and
assert it receives the resolved view model and the current origin. Cheap, and it
pins the SSR contract.

### 2.2 Nothing tests the route wiring

**Proved:** deleting `resolve: { storefront: storefrontResolver }` from
`app.routes.ts` leaves **all 23 tests green**. In production every vendor
subdomain would render "Boutique introuvable".

`storefrontResolver` and `StorefrontPage` are each well tested; nothing connects
them. vendor-frontend's `app.spec` exercises routing end-to-end — the equivalent
is missing here.

**Fix:** a `RouterTestingHarness` test that navigates to `''` with the API stubbed
and asserts the vendor's name renders.

### 2.3 The `tel:` link is unasserted

`storefront-page.spec.ts:49` asserts `textContent).toContain('0102030405')`,
which only sees the link's *text*.

**Proved:** hard-coding `href="tel:BROKEN"` in `storefront-footer.ts` leaves
**all 23 tests green**.

Tap-to-call is the storefront's only conversion action — the whole reason the
phone number is on the page.

**Fix:** `expect(getByRole('link', { name: '0102030405' })).toHaveAttribute('href', 'tel:0102030405')`.

### 2.4 The hero never renders a cover photo in any test

Both `storefront-page.spec` fixtures set `coverUrl: null`, so only the hatched
placeholder branch ever runs — `storefront-hero.ts:10` (the `<img>`) is
uncovered. Meanwhile `storefront.resolver.spec` goes to real trouble building the
Cloudinary cover URL, and nothing then proves the page displays it.

**Fix:** give the page-spec fixture a `coverUrl` and assert the `<img src>`. The
page spec's fixture should mirror the resolver spec's, which does have a cover.

### 2.5 The real dismissal path never runs

`dish-sheet.ts:132` and `:139–141` are uncovered. jsdom has no `matchMedia`, so
`dismiss()` always takes the `else` shortcut and calls `close()` directly. Both
the backdrop-click and drag-dismiss tests therefore validate only the
test-environment path; the production browser path — set `.closing`, wait for
`transitionend`, then close — is never exercised.

The comment on `dismiss()` explains this is a WebKit top-layer workaround. If
`onSlideEnd` regressed, the sheet would stick open on iOS and every test would
stay green.

**Fix:** stub `matchMedia` to return `matches: false`, dismiss, assert the
`.closing` class, dispatch a `transitionend` with `propertyName: 'transform'`,
then assert the dialog closed.

### 2.6 Minor uncovered branches

- `market-card.ts:28–31` — a market with no hours, or no address. Both fixtures
  always have both.
- `drag-to-dismiss.ts:47–48` — `pointercancel` / `reset()`, a real mobile path.
- `request-url.ts:11` — the SSR `new URL(request.url).origin` branch, i.e. the
  one the comment says is load-bearing behind Render's proxy. Only the client
  branch runs.

---

## Tier 3 — Non-behavioural assertion style

### 3.1 `storefront-page.spec.ts` asserts on text blobs and structural selectors

The rest of the monorepo's frontend tests query by role and label via
`@testing-library/angular` (already a root dependency, `package.json:73`). This
file uses none of it:

- **Text-blob matching.** Nearly every assertion is
  `fixture.nativeElement.textContent).toContain(...)`. That proves a string
  appears *somewhere on the page* — not that it renders in the right element, in
  the right section, or visibly. The published-storefront test would pass if the
  vendor name leaked into a hidden `<div>` and the `<h1>` were empty. It is also
  what makes §2.3 possible.
- **`querySelector('dialog .overflow-y-auto')`** (`:144`) — couples to a Tailwind
  utility class. Restyling the scroll container silently disables the test.
- **`(dialog.querySelector('div') as HTMLElement).firstElementChild`** (`:183`) —
  positional structure-walking to reach the drag handle. Any wrapper element
  breaks it.
- **`querySelector('h3')`** (`:164`) standing in for "the sheet's content".
- **`[data-dish="…"]`** (`:91`, `:123`, `:142`, `:147`, `:158`, `:178`) — a
  test-only attribute where `getByRole('button', { name: /bœuf bourguignon/i })`
  would assert the accessible name at the same time.

**Fix:** port the file to `@testing-library/angular`, as vendor-frontend already
does. This is not only style — the role/label queries would have caught §2.3 for
free, and would give the dish cards accessible-name coverage they currently lack.

---

## Not findings

- **`storefront-view-model.spec.ts` vs `storefront.resolver.spec.ts`** — the
  resolver spec deep-equals a full mapping for simple dishes; the view-model spec
  covers the *variant* path the resolver spec omits. Complementary.
- **`storefront-metadata.spec.ts`** — no changes suggested. Model file.
- **`resets the scroll position when a different dish is opened`** — genuinely
  behavioural and load-bearing, despite the Tailwind selector noted in §3.1.

---

## Suggested order of work

1. Assert the metadata wiring in `storefront-page.spec`. *(§2.1 — the SSR
   contract)*
2. Add the routing test, replacing `app.spec`'s smoke test. *(§2.2, §1.1)*
3. Assert the `tel:` href, and give the page fixture a cover photo. *(§2.3, §2.4)*
4. Cover the browser dismissal path with a stubbed `matchMedia`. *(§2.5)*
5. Port `storefront-page.spec` to `@testing-library/angular`. *(§3.1)*
6. Turn on `"coverage": true` in this project's `test` target, as
   vendor-frontend already has — every §2 gap above is visible in a coverage run
   and invisible without one.
