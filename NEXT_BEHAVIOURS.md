# Next Behaviours

The single backlog (ADR 0017). One line per item; rationale lives in the linked
doc. Legal and website work track their own remaining sections:
`docs/PRIVACY-PLAN.md` · `docs/WEBSITE-PLAN.md` · `docs/MENTIONS-LEGALES-PLAN.md` · `docs/CGU-CGV-PLAN.md`.

## Where we stand

As of 2026-11-22. The one place that says what is moving, what waits on whom, and what
comes next; each line points at the doc that holds the detail. Update it when a line moves.

**Now**

* building ordering in `packages/ordering`, test-first from `test/src/ordering/` (board; ADRs 0066–0069): step 1's payment account built, slices 1–4 (registration over HTTP, account creation, the accounts webhook, notices read into facts); step 2's first slice, an order placed, under way: `PlaceOrder` places or refuses the order Stripe holds a card for, a `TradingDay` judging its dishes (closed, ended, sold out or off the menu), a resent hold recording nothing, and a hold on another account than the vendor's current one turned away. Ordering stays out of `AppModule` until the Stripe adapter
* ordering, event-stormed on the ordering board (`docs/ordering-board/`, published as `ordering-board`). Timeline agreed as a first pass; step 1, vendor onboarding, decided and built. Four rules agreed (R1 nothing recorded before Stripe holds the card · R2 processors call Stripe, webhooks record the outcome · R3 Stripe onboarding prefilled from the mentions légales · R4 no orders without a Stripe account that can take payments, publication no longer waiting for it); Connect setup: Accounts v2, direct charges, the Express Dashboard, Stripe collecting its fees from the vendor and covering losses, which the sandbox accepts on Stripe's preview version only, for the create call alone, an account's dashboard fixed for good (Q14, tried 2026-11-15); built on Express, new accounts moving to the full Dashboard if the preview ends; the payment account (Q1): its events, webhooks read in order by a processor, the prefill sent to Stripe as an account token from the vendor's browser; when payments stop (Q11), held orders refused and ordering paused; Stripe checks its account against the storefront, and the vendor is prompted to update Stripe when their mentions légales change (Q9); steps 2 to 6 stormed: a 10-minute timeout, the customer's cancel, a refund when the vendor leaves early, refunds only to the card, disputes as their own events, a rush pause, the customer emails and vendor pushes; 4 questions open; step 1's build designed in ADRs 0066–0069 (2026-11-15): Ordering asking Market Days through published queries, Stripe's account notices through one processor and payments direct, one payment account per vendor registered after publication, the Stripe adapter over raw HTTP with its contract run against the sandbox nightly
* price: one package at 50 € HT a month, ordering included, no commission (`docs/MARKET_MIAM.md`)
* admin app — live at `admin.marketmiam.fr` since 2026-11-01: GitHub sign-in to an operator route in `api` (`docs/ADMIN-PLAN.md` slice 0, ADR 0059); the account list (slice 1) shipped and `admin-api` retired (slice 2); inviting vendors built 2026-11-14 (slice 4, ADR 0060: invitation-only, an event a processor turns into the Auth0 account; the admin app on ADR 0061's layering, whoami retired); the owner's steps done 2026-11-14, but for the post-login Action's code, still to come into the repo; erasing vendors live 2026-11-14 (slice 5, ADR 0063: the account's opening and closing recorded on the vendor's stream, the Auth0 user deleted by a processor, *Erase* in the admin app); assigning a subdomain built 2026-11-14 (slice 3, ADR 0065: the name claimed and recorded in one transaction, free again at once on erasure, *Assign* in the admin app, ending the hand-written SQL), live once `api` and `admin-frontend` are deployed by hand on Render; next, rebuilding a projection (slice 6)

**Waiting on someone else**

* the live client — provide their legal identity, then the storefront footer's stopgap comes out (`docs/MENTIONS-LEGALES-PLAN.md` slice 8); declare every dish's allergens (`docs/ALLERGENS-PLAN.md` slice 4); a test Stripe onboarding; later, connect Stripe from the vendor app like any vendor (board R4)
* the lawyer — brief ready to send: 17 questions with dated copies of the texts and the draft vendor terms. No lawyer has reviewed any Market Miam text yet, so E1 asks for a full read of all of them (`docs/ordering-board/avocat.html`, `docs/CGU-CGV-PLAN.md`)
* the accountant — brief ready to send: 6 questions on cash-register software, e-invoicing, and refunds and disputes (`docs/ordering-board/expert-comptable.html`)
* Stripe — on the board, one message to Stripe support, also asking whether an object fetched just after a thin event shows that event's change (ADR 0067): whether a valid hold can still be refused at capture, and what reports it, after two sandbox checks, since the sandbox can't refuse one: a cancelled hold's capture refused with no event (2026-11-15), an expired hold sending `charge.expired` then `payment_intent.canceled` (`expired`) at its `capture_before` (2026-11-22) (Q5), so the message is ready to send; what becomes of Express accounts if their preview ends, needed before the live client's first live account (Q14)
* the owner, outside the repo — the Tally form's copy, a CTA and the demo link checked on the real domain (`docs/WEBSITE-PLAN.md` §1–2); the art. 30 register and the DPAs (`docs/PRIVACY-PLAN.md` §2–3); the trademark registration (`docs/MARKET_MIAM.md`)

**Next**

* Stripe support's answers on refused captures (Q5), the sandbox checks done, and on Express accounts if the preview ends (Q14), and the lawyer's DAC7 answer (Q10) (`docs/ordering-board/index.html`)
* design: lo-fi wireframes of the market-day screen and the two-phase checklist, drafted and to agree (`docs/design/vendor-app-wireframes.html`); then the design system as a Design System artifact, and the screens mocked up in it (`docs/ORDERING-PLAN.md`, *Vendor app*)
* step 2's first slice, its api half: the payments webhook on its own signing secret, `StripeSignatureGuard` learning which secret goes with which route; the hold recorded from Stripe's thin `checkout.session.completed`, ignoring its `payment_status`; a payments port and fake turning the fetched session into a `HeldOrder`, a session without our order ID recording nothing; the `TradingDays` adapter over a new Market Days query folded from the day's stream in the log, its hours from its view, with its own spec and ADR 0066's one-line amendment; `PlaceOrderHandler` wired into `OrderingModule`. Checkout's metadata carries our order ID, the vendor, the market and the date. Then *Check out*, the customer's anonymous call that opens the 30-minute page (the board's *Place an order* row, renamed so that "placed" always means the card is held), then steps 3a to 6, the vendor app, the storefront, the website and a pilot (`docs/ORDERING-PLAN.md` steps 5–9)
* waiting for their moment in ordering: the order learns its vendor from its first event at 3a's first red, since a vendor may accept only their own orders; the order's state becomes state objects once 3a gives it a lifecycle; one repository shape for vendor-scoped streams, and the two order event builders' shared facts, wait. Still open in its rules: which of closed and ended wins (unpinned); a dish taken off the menu counts as sold out for now; whether `OrderPlaced` records the account, which capture will need
* held for later screens and slices: the vendor app's *Réessayer* resends the same registration, with no automatic resend and no offline queue (to record with the Connect Stripe screen); with the Stripe adapter, `STRIPE_ACCOUNTS_WEBHOOK_SECRET` and the payments destination's secret go in `render.yaml` and `.env.example`, `bootProductionApp` sets them, and a restricted sandbox key becomes a GitHub secret before the first nightly run
* the Stripe adapter, when it lands (ADR 0069): each Checkout line carries its dish and variant in the line's own metadata, read back with the session through `expand[]=line_items`, which Stripe's docs omit from their example (sandbox, 2026-11-22). An inline price leaves one inactive Product per line on the account; what `payment_status` reads once a held card completes a page is still to check

## Product

* ordering — same-day orders from a live market day's menu, paid online at order, collected with a code (`docs/ORDERING-PLAN.md`). Decided 2026-10-04: the live client and every prospect need it before Market Miam is usable. The plan's *Order of work* runs it: lawyer and accountant, a test Stripe onboarding, then the `packages/ordering` context
* allergens per dish — the 14 declared in the dish form and shown in the storefront's dish sheet, ahead of ordering (`docs/ALLERGENS-PLAN.md`). Slices 1–3 deployed; the rollout asks the live client to declare every dish
* live mode — the storefront leads with the market the vendor is standing in; sold-out per dish, closing the day, and the end-of-day bilan (`docs/LIVE-MODE-PLAN.md`). Slices 1, 2 and 2b are shipped, which subsumes *mark as sold out* and *item rated for market day*. No *open market day*: the start follows from the schedule. Slice 3 remains: the query split and the full-page *en direct* takeover, which the storefront lacks nothing concrete for
* what the bilan says over time — the recorded outcomes read back as (dish × market) piles: a line in the menu editor, a *Ce qui se vend* page per market, and the transpose on a catalogue dish (`docs/BILAN-RETROSPECTIVE-PLAN.md`). Decision 14a of the live-mode plan, come due. **Slice 1 shipped, back and front** — `FindSellingRecord` over a six-month fold of `menusFor`, `GET /selling-record`, no new event and no new read model; on the vendor side a `selling-record/` facade set and the pile line under each dish in the menu editor. Slices 2 and 3 — the per-market page and the transpose on a catalogue dish — are **deferred as unnecessary for now**; they consume the same payload and need no new backend, so they cost nothing to leave. Trigger, and the gap it closes, in the plan's *Deferred* section
* remove item photo · clear storefront cover photo
* retiring an item doesn't check if it's been planned
* category + tags for dishes (`ItemAddedToCatalogue` v2, form + list cards)
* schedule cadence picker: every-N-weeks + one-off (domain/API/read model support both; the UI pins weekly)
* prepared-state overlay — design pass done: menus join onto occurrences (`docs/archive/MENU-DU-JOUR-PLAN.md`, decisions 4–5). Closing shipped and *open* was rejected (ADR 0049), so nothing blocks the attended state now

## Polish

* add/revise error banners (`AddItemFailure`/`ReviseItemFailure` emitted but unreduced)
* variant follow-ups: per-variant photos · per-variant sold-out · incremental variant commands · drag-drop reorder (`docs/archive/DISH-VARIANTS-PLAN.md`)
* nine small OO refactors (#2–4, #7–12 — per-item fixes in `docs/archive/OO-SMELL-AUDIT.md`)
* F1, the api suite's *socket hang up* flake: run `nx test api` 24 times on Linux; if it never reproduces, close it as a macOS-only annoyance (`docs/findings/f1-api-suite-socket-hang-up-flake.md`)
* act on the frontend test-audit findings — vacuous tests, untested seams, customer-frontend coverage config (`docs/archive/VENDOR-FRONTEND-TEST-AUDIT.md` · `docs/archive/CUSTOMER-FRONTEND-TEST-AUDIT.md`)
* the event model, redrawn as Dilger draws one on 2026-11-22: confirm the defaults taken while building it, the order within each stage of `tools/event-model/story.mjs` first (`docs/EVENT-MODEL-PLAN.md`)
* Opens Vendor Accounts, Closes Vendor Accounts and Opens Storefronts: their specs assert the commands sent; rewrite them, test-first, to assert what is recorded (`docs/EVENT-MODEL-PLAN.md`, *Open*)

## Deferred — trigger-gated (rationale: `docs/archive/DEFERRED.md`)

* `vendorIdFrom` validation — when a failure scenario justifies it
* client-supplied idempotency's general front gate — when a key supplied by a browser has no stream to name; Stripe's side effects are settled by ADR 0067, a stream keyed on the outside ID
* subscription as a publication requirement — when the first paid plan ships (context decisions taken: ADR 0048)
* scoped projection reset — when full-log replay gets slow or erasure volume gets user-visible
* orphan-checkpoint detection — if a checkpoint is ever renamed
* per-event dead-lettering — on the first real poison event (alert design ready: `docs/O11Y-PLAN.md`)
* lock-free appends — when appends stay above ~50/s or p99 append latency climbs; measured ceiling ~155/s at a 1.7 ms round trip (M6); design ready: a capped high-water mark
* per-type span attributes — evidence-gated, design ready (`docs/O11Y-PLAN.md`; the stuck-subscription alert shipped with live-mode slice 1)
* OTel collector + tail-based sampling — until volume warrants
* ops transport for `rebuild` — slice 6 of `docs/ADMIN-PLAN.md`; erasure's, with the automated Auth0 user delete, is slice 5, built
