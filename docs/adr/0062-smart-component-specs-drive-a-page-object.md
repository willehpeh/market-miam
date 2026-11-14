# 0062. Smart-component specs drive the screen through a page object

Date: 2026-11-14 · Status: Accepted

Builds on ADR 0061 (tests at two levels) and ADR 0006 (fakes at boundaries). Covers the
smart-component specs of the vendor and admin apps.

## Context

ADR 0061 tests a smart component against fake facades, rendering its real dumb children. Those
specs find what they touch with Testing Library's role and label queries, the suite's convention,
written out in each test, plus a render helper and a few action helpers of each file's own.

The queries carry the screen's French copy, which changes more than anything else on it, and
which no lawyer has reviewed yet. They also repeat. `add-item.spec.ts` asked for the "Ajouter à ma
carte" button and the "Nom du plat" field ten times each, 128 queries over 60 tests.
`add-schedule.spec.ts` asked for "Mardi" fourteen times. A reworded label meant editing every test
that touched it, and a test read as `fireEvent`s, regexes and `detectChanges()` calls rather than
as what the vendor does.

The render helpers also hand out the fakes, often as `TestBed.inject(Facade) as FakeFacade`:
25 such casts in the vendor app's specs, which the compiler cannot check, because the token is
the abstract facade.

## Decision

**A smart component's spec drives it through a page object**: a plain class beside the
component, in `<component>.page-object.ts`, built on Testing Library.

- **It names the controls the user reaches for, by the labels they read**, as methods returning
  elements: `addButton()`, `formatNames()`, `allergen(/^lait$/i)`. Where a spec asserts that
  something is absent, a `query…` twin returns `null`, as Testing Library splits `getBy` from
  `queryBy`.
- **It does what the user does**: `enterName('Pizza')`, `chooseSeveralFormats()`,
  `askToDelete()`. Each action runs change detection and returns the page object, so actions
  chain. Rows and steps count from 1, as the user reads them in the controls' names.
- **It asserts nothing.** `expect` stays in the spec, and so does any copy the spec checks for,
  such as `screen.getByText('Indiquez le prix.')`, so that an assertion reads whole where it fails.
- **It never hands out a facade.** The spec builds the fakes it arranges or checks and passes them
  to the page object's `render`. A page object defaults to a fresh fake for specs that look at
  neither. `TestBed.inject(…) as Fake…` goes. A fake that several specs fill with data has a
  builder beside it, such as `catalogueOf(...items)` in `fake.catalogue.facade.ts`.
- **It extends `PageObject`** (`core/page-object.ts`), which holds what every page object does
  alike: change detection, and pressing, typing and picking a file.
- **It models the screen, not the component tree**: one page object per smart component, covering
  the dumb children it renders, so they can still be split or merged without breaking a test
  (ADR 0061). A part that appears on several screens, such as the photo picker, may get an object
  of its own that the pages use. A dumb component does not get one for being a component.
- **Its class name ends in `PageObject`**, because `CataloguePage` and `OperatorPage` are
  already components.

Specs move to page objects as they are next touched, the most repetitive first. A short spec with
little repetition need not move. Feature specs, which run a facade down to `HttpTestingController`,
render nothing and are unaffected.

Moved with this record: the eleven vendor specs that asked for 25 or more queries — the dish
screen, the dashboard and its market-day cards, the live screen, the menu and price editors, the
schedule form, the carte list, the QR code screen, and the legal-identity and storefront forms.
Not moved: the short ones (`bilan`, `markets-list`, `layout`, `reorder-items`, `landing`,
`bilan-prompt`, `catalogue-page`, `welcome`, `app`), and the admin app, whose specs still test
components straight over HTTP until ADR 0061's page spec replaces them.

## Consequences

- A label change is one line. In the pilot, renaming the "Descendre le format" buttons fails four
  tests, all fixed by one line in `add-item.page-object.ts`.
- Specs read as the user's steps, and their arrangement is visible: a test that checks a command
  builds the fake it checks.
- More code in total, not less. `add-item.spec.ts` went from 842 lines to 703, with no
  `fireEvent` left and 14 of its 128 queries, all checking copy. Its page object adds 271 lines.
  Across the eleven specs moved, the same 306 tests went from 573 queries to 146, all checking
  copy, from 172 `fireEvent` calls to none, and from 3,916 lines to 5,442 with the page objects.
  Some specs grew on their own: a render helper that set its fakes after render now shows that
  arrangement in each test. A page object is code to keep, and it grows with its screen.
- Selectors that a label cannot replace remain, now in one place. The dish screen's two file
  inputs are hidden behind their buttons and carry no label.
- One assertion changed form: the submit button's reasons are checked with
  `toHaveAccessibleDescription` rather than by following `aria-describedby` through the
  rendered container, which the page object does not expose.

## Rejected

| Option | Why not |
|---|---|
| Angular CDK component harnesses | They locate by CSS selector, with no role or accessible-name query, so the suite would lose its role/label convention. Every query becomes async. They are built for libraries whose users cannot see the components' internals, and these specs sit beside the components. They would add `@angular/cdk`, which is not installed |
| Harnesses for settling, with Testing Library queries inside | Reaching through a harness for native elements gives up its abstraction and keeps its machinery |
| Page objects that expose the fakes | Mixes the screen with the boundary. The spec should own what it arranges and what it checks |
| Assertion methods on page objects, such as `expectAddDisabled()` | A failure no longer says what was checked, and such methods multiply |
| A page object per dumb component | Ties the specs to how the screen is split, which ADR 0061 rules out |
| Helpers per file, as before | Each spec repeats the queries the others need, and the helpers grow with no shape |
