# Next Behaviours

The single backlog (ADR 0017). One line per item; rationale lives in the linked
doc. Legal and website work track their own remaining sections:
`docs/PRIVACY-PLAN.md` · `docs/WEBSITE-PLAN.md` · `docs/MENTIONS-LEGALES-PLAN.md` · `docs/CGU-CGV-PLAN.md`.

## Where we stand

As of 2026-11-25. The one place that says what is moving, what waits on whom, and what
comes next; each line points at the doc that holds the detail. Update it when a line moves.

**Now**

* building ordering in `packages/ordering`, test-first from `test/src/ordering/` (board; ADRs 0066–0069): step 1's payment account built, slices 1–4 (registration over HTTP, account creation, the accounts webhook, notices read into facts); step 2's first slice, an order placed, under way: `PlaceOrder` places or refuses the order Stripe holds a card for, a `TradingDay` judging its dishes (closed, ended, sold out or off the menu), a day no schedule covers refused as closed (`NoTradingDay`), a resent hold recording nothing, and a hold on another account than the vendor's current one turned away. Ordering stays out of `AppModule` until the Stripe adapter
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
* step 2's first slice, an order placed, built use case first and wired last (2026-11-25): `PlaceOrder(checkoutId, accountId, receivedAt)` asks the `Payments` port, its in-memory fake until the Stripe adapter, for the completed checkout; asks Market Days for the live day, `FindLiveMarketDay` folding the day's own stream through `Stand`, its phase from the schedule view and the Paris clock, no day when no schedule covers the date, through the api's `MarketDaysTradingDays`, Ordering's anti-corruption layer (ADR 0066's amendment); and checks the merchant's account. `POST /webhooks/stripe/payments` places the order from Stripe's thin `v1.checkout.session.completed`, the account read from `context` and the checkout from `related_object.id`; each Stripe route checks only its own destination's secret, and the payments route refuses an event it can't read or doesn't handle. Decided: one `Payments` port, `PaymentAccounts`' counterpart, growing slice by slice; the route's own `STRIPE_PAYMENTS_WEBHOOK_SECRET`; names in Ordering's words, Stripe's only in the adapter and the webhook, with no provider-neutral layer; `payment_status` ignored, a held card reading `unpaid`; Market Days' `over` and `past` read as ended; an order for a day no schedule covers refused as closed, through `NoTradingDay`; an event type the route doesn't handle refused; absence left out until a screen can declare today absent. What remains is in *Ordering, by importance and urgency*, below
* waiting for their moment in ordering: the order learns its vendor from its first event at 3a's first red, since a vendor may accept only their own orders; the order's state becomes state objects once 3a gives it a lifecycle; one repository shape for vendor-scoped streams, and the two order event builders' shared facts, wait. A completed page without our order ID fails loudly, the adapter throwing, since today only our own bug could make one; if Q14 moves vendors to the full Dashboard, where they can sell through their own account, it becomes quiet and logged (decided 2026-11-25). Still open in its rules: which of closed and ended wins (unpinned); a dish taken off the menu counts as sold out for now; whether `OrderPlaced` records the account, which capture will need
* held for later screens and slices: a vendor can declare today absent through the api (`POST /market-schedules/:scheduleId/absences`, no date limit), though no screen does yet, so Market Days' live-day query leaves absence out; when an absence screen is built, decide whether today's absence closes the day for orders or is refused in favour of closing it (checked 2026-11-25); the vendor app's *Réessayer* resends the same registration, with no automatic resend and no offline queue (to record with the Connect Stripe screen); with the Stripe adapter, `STRIPE_ACCOUNTS_WEBHOOK_SECRET` and the payments destination's secret go in `render.yaml` and `.env.example`, `bootProductionApp` sets them, and a restricted sandbox key becomes a GitHub secret before the first nightly run
* the Stripe adapter, when it lands (ADR 0069): each Checkout line carries its dish and variant in the line's own metadata, read back with the session through `expand[]=line_items`, which Stripe's docs omit from their example (sandbox, 2026-11-22). An inline price leaves one inactive Product per line on the account. A page completed with a held card reads `status: complete` and `payment_status: unpaid`, its PaymentIntent `requires_capture`, so `payment_status` is rightly ignored; the thin event reads `type: v1.checkout.session.completed`, `related_object: { id: cs_…, type: checkout.session, url: /v1/checkout/sessions/cs_… }`, and names the v1 event it stands for in `snapshot_event` (sandbox, 2026-11-25, on the platform account, so `context` was null). A thin event about an object on a connected account names that account in `context`; Stripe lists the event only when asked as the account (`Stripe-Context`), and fetches the object with `Stripe-Account` or `Stripe-Context` set to it, `resource_missing` without (sandbox, 2026-11-24, on a Customer; a payment's own event not yet seen)

## Ordering, by importance and urgency

Every ordering behaviour still to build, most important and most urgent first: what weakens what is built, then what a first real order needs, in the order the flow reaches it. Kept current as each lands or is found; decisions and their reasons live on the board (`docs/ordering-board/`).

1. the live day reports a sold-out dish taken off the menu and put back as available, as the storefront does (`SoldOutItems.keptBy`): rare, but needed before the slice is live
2. the order placed records the customer's email, sealed under the day's key, and a hold recorded after midnight is refused without it (board, *5, the day's key*): every customer email needs it, and `OrderPlaced`'s shape is cheapest to change before anything is live
3. *Check out*: the customer's anonymous call that opens a 30-minute Checkout page on the vendor's account, the card held, not charged. Every check runs first: the account can take payments, the market is trading by its hours, the dishes are on the menu and not sold out, orders aren't paused. The price comes from Market Days' menu, the order is capped at 119,99 €, and our order ID, made here, rides in the page's metadata with the vendor, the market and the date, each line carrying its dish and variant (board, step 2)
4. the Stripe adapter behind `Payments` and *Check out*: the page created on the vendor's account, the completed page fetched with `Stripe-Context` and its lines; its contract run nightly against the sandbox with a restricted key; both webhook secrets in `render.yaml` and `.env.example`; Ordering into `AppModule` (ADR 0069)
5. the vendor accepts an order within 10 minutes, capped at the day's end; the hold is captured, the payment recorded from Stripe's webhook, and the customer given their code (step 3a, Q5)
6. an order refused by the vendor, cancelled by the customer until the acceptance reaches us, or left unanswered for 10 minutes: its hold released, recorded from Stripe's webhook (step 3b)
7. a payment account disabled: its held orders refused, and its storefront taking no orders until it can take payments again (step 3b, R4, Q11)
8. a refused capture marks the order *payment refused, don't hand over* and alerts the vendor (Q5, waiting on Stripe support)
9. an order handed over with its code, matched against the day's open orders (step 4)
10. a paid order handed over without its code, as its own event, the customer emailed at once (step 4, Q7)
11. the market day ends: remaining holds released; paid orders not collected become no-shows, unless the vendor closed by hand and didn't reopen, which refunds them (step 5)
12. the day's customer details erased at midnight, Paris time, its key shredded (step 5)
13. a vendor erased with orders in flight: holds released, paid orders not collected refunded at once, customers emailed (board, *5, erasure*)
14. a refund recorded from Stripe's webhook, with its amount, partial ones included (step 6, Q8)
15. a dispute opened, then won or lost, as events of its own (step 6, K6)
16. the vendor pauses new orders without closing the day, for a set time or until they resume (board, *2, rush*)
17. the customer's status page and emails, and the vendor's pushes, each landing with the step that sends it once the email provider is in (board, *Customer emails*, *Vendor pushes*; plan step 7)

Held for a trigger, unranked: whether today's absence closes the day for orders, when a screen can declare it; a checkout without our order ID going quiet and logged, if Q14 moves vendors to the full Dashboard; which of closed and ended wins, unpinned while only the customer's message differs.

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
