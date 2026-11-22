# Event model — plan

The event-model site (`tools/event-model`, published as `event-model`): the system's behaviour as
an event model, derived from each bounded context's tests and declared seams, never hand-drawn.
Reworked on 2026-11-22 to read as Martin Dilger draws event models. Its predecessor was a timeline
grouped by aggregate, with actors as pills over the commands, automations in the command row and
specifications only in the side panel. Lo-fi wireframes of the new layout, drawn before the
build, are on a private claude.ai canvas: https://claude.ai/artifact/T2bF6k4dGTpYfv4WAKn8yD

## Decided, 2026-11-22

1. **Dilger's lanes.** From the top: one lane per actor with its screens (customer storefront,
   vendor app, operator console), Stripe, the automations' gears; the spine of commands and read
   models; one lane per event stream. Each slice is a framed column with its kind and name on top.
2. **An automation's trigger runs from the event straight to its gear.** Dilger puts a to-do read
   model between them. Our processors have none, and a card with no spec, projection or source
   behind it would break the rule that everything on the board is derived. A processor that gains a
   real to-do projection shows it with no change here.
3. **One column per command an automation sends**, its gear drawn over each. Dilger's slice holds
   one command; Opens Vendor Accounts becomes two columns, Record Vendor Account Opened and Erase
   Vendor.
4. **An automation's specs are filed by what they assert**: under the gear over the command whose
   event they assert; else the command they assert it sends; else, asserting neither (a spec where
   the automation decides not to act), under every one of its gears.
5. **A command placed twice files its own specs by their Given.** Made exact in the build: a spec
   goes under every place where everything it is given has already happened on the timeline, the
   last place if nowhere. Erase Vendor, under the gear at sign-up and from the operator console when
   leaving: *erases a registered vendor* and *raises nothing when already erased* go to leaving only;
   *erases a vendor invited and never registered* and *rejects erasing a vendor it has no record of*
   go to both.
6. **One timeline, the vendor's lifecycle**, both contexts on it; the stream lanes are grouped and
   labelled by context, so the boundary of ADR 0066 stays visible. The order is kept by hand in
   `tools/event-model/story.mjs`, the only hand-kept part: every card is still derived.
7. **The stages**: invitation & sign-up · legal identity · catalogue · storefront · payments ·
   schedule & prices · market day · leaving. Legal identity comes before publication (a storefront
   without one can't be published, `docs/MENTIONS-LEGALES-PLAN.md`), the catalogue before it too
   (the owner), payments after it (the payment account is registered after publication,
   `docs/ORDERING-PLAN.md`).
8. **A slice missing from the story** is shown under *Unsorted*, at the end, with a warning. The
   generator does not fail: the site is built by Render after `main`, where a failed build goes
   unseen and leaves the old site up. The story is also checked against what each slice
   presupposes, and a contradiction warns.

## Defaults taken while building, to confirm

- **A screen card** says the actor and the command's title, or for a read model the query it
  answers (`FindVendorLegalIdentity` → *Vendor Legal Identity*); the code knows no screens.
- **The order within each stage** in `story.mjs` is a first draft.
- **Event names are spaced** on the board (*Vendor Invited*); the drawer keeps the type.
- **How a spec is read.** Given: every event its own body mentions outside its assertions, with the
  history its file's `beforeEach` sets up and the file's helpers it calls (`given(registered())`,
  `await invite()`), and each command it runs as the event that command records. Then: the events it
  asserts in `store.newEvents()`, or that nothing was recorded, the error it expects, or the commands
  it asserts were sent. A command's spec that checks its outcome through a helper of its own is read
  as recording the command's event, unless its title says nothing is. A spec that asserts none of
  these (*opens an account for an invited vendor*, which checks Auth0's fake) reads *outside the
  event store*.

## Built, 2026-11-22

- **Generator**: `it.each` tables holding parentheses no longer hide their test (five specs back);
  a command an automation also sends keeps its other actors (Erase Vendor, from the operator
  console); each spec's Given / When / Then; the columns, the gears and where each spec hangs, from
  `story.mjs`.
- **Page**: the board above; a toolbar to highlight one context, jump to a stage, search, hide the
  screens, show the specifications under each column, and zoom; an overview strip of the whole
  timeline with the viewport, dragged to scroll; the slice drawer with every spec as Given / When /
  Then.

## Open

- **Three automations' specs assert the commands sent**, not what is recorded: Opens Vendor
  Accounts, Closes Vendor Accounts and Opens Storefronts (`gateway.dispatched`), against the rule
  that specs assert behaviour. Rewritten to assert recorded events, test-first, the command fallback
  of decision 4 goes unused.
- **Place Order has no actor** until Ordering is wired into the api.
- **The payment account's retirement on erasure** (`docs/ORDERING-PLAN.md`) has no slice yet; it
  belongs in *Leaving*.
