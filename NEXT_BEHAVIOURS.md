# Next Behaviours

The single backlog (ADR 0017). One line per item; rationale lives in the linked
doc. Legal and website work track their own remaining sections:
`docs/PRIVACY-PLAN.md` · `docs/WEBSITE-PLAN.md` · `docs/MENTIONS-LEGALES-PLAN.md` · `docs/CGU-CGV-PLAN.md`.

## Where we stand

As of 2026-10-31. The one place that says what is moving, what waits on whom, and what
comes next; each line points at the doc that holds the detail. Update it when a line moves.

**Now**

* ordering, event-stormed on the ordering board (`docs/ordering-board/`, published as `ordering-board`). Timeline agreed as a first pass; step 1, vendor onboarding, being worked in detail. Four rules agreed (R1 nothing recorded before Stripe holds the card · R2 processors call Stripe, webhooks record the outcome · R3 Stripe onboarding prefilled from the mentions légales · R4 no orders without a Stripe account that can take payments, publication no longer waiting for it); Connect setup: Accounts v2, direct charges, the Express Dashboard, Stripe collecting its fees from the vendor and covering losses; the payment account (Q1): its events, webhooks read in order by a processor, the prefill sent to Stripe as an account token from the vendor's browser; when payments stop (Q11), held orders refused and ordering paused; Stripe checks its account against the storefront, and the vendor is prompted to update Stripe when their mentions légales change (Q9); 6 questions open
* price: one package at 50 € HT a month, ordering included, no commission (`docs/MARKET_MIAM.md`)

**Waiting on someone else**

* the live client — provide their legal identity, then the storefront footer's stopgap comes out (`docs/MENTIONS-LEGALES-PLAN.md` slice 8); declare every dish's allergens (`docs/ALLERGENS-PLAN.md` slice 4); a test Stripe onboarding; later, connect Stripe from the vendor app like any vendor (board R4)
* the lawyer — brief ready to send: 15 questions with dated copies of the texts and the draft vendor terms (`docs/ordering-board/avocat.html`, `docs/CGU-CGV-PLAN.md`)
* the accountant — brief ready to send: 6 questions on cash-register software, e-invoicing, and refunds and disputes (`docs/ordering-board/expert-comptable.html`)
* Stripe — two sandbox tests on the board: a refused capture (Q5), a French Express account on Accounts v2 (Q14)
* the owner, outside the repo — the Tally form's copy, a CTA and the demo link checked on the real domain (`docs/WEBSITE-PLAN.md` §1–2); the art. 30 register and the DPAs (`docs/PRIVACY-PLAN.md` §2–3); the trademark registration (`docs/MARKET_MIAM.md`)

**Next**

* the rest of step 1's questions, then event-storm steps 2 to 7 (`docs/ordering-board/index.html`)
* then build, in the plan's order: the ordering context, the vendor app, the storefront, the website rebuilt around ordering with its price, a pilot with real cards (`docs/ORDERING-PLAN.md` steps 5–9)

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

* dish eager rendition (`ponytail:` in `catalogue.controller.ts` — still warms the cover-photo size)
* add/revise error banners (`AddItemFailure`/`ReviseItemFailure` emitted but unreduced)
* variant follow-ups: per-variant photos · per-variant sold-out · incremental variant commands · drag-drop reorder (`docs/archive/DISH-VARIANTS-PLAN.md`)
* nine small OO refactors (#2–4, #7–12 — per-item fixes in `docs/archive/OO-SMELL-AUDIT.md`)
* F1, the api suite's *socket hang up* flake: run `nx test api` 24 times on Linux; if it never reproduces, close it as a macOS-only annoyance (`docs/findings/f1-api-suite-socket-hang-up-flake.md`)
* act on the frontend test-audit findings — vacuous tests, untested seams, customer-frontend coverage config (`docs/archive/VENDOR-FRONTEND-TEST-AUDIT.md` · `docs/archive/CUSTOMER-FRONTEND-TEST-AUDIT.md`)

## Deferred — trigger-gated (rationale: `docs/archive/DEFERRED.md`)

* `vendorIdFrom` validation — when a failure scenario justifies it
* client-supplied idempotency — on the first relative mutation or non-repeatable side effect
* subscription as a publication requirement — when the first paid plan ships (context decisions taken: ADR 0048)
* scoped projection reset — when full-log replay gets slow or erasure volume gets user-visible
* orphan-checkpoint detection — if a checkpoint is ever renamed
* per-event dead-lettering — on the first real poison event (alert design ready: `docs/O11Y-PLAN.md`)
* lock-free appends — when appends stay above ~50/s or p99 append latency climbs; measured ceiling ~155/s at a 1.7 ms round trip (M6); design ready: a capped high-water mark
* per-type span attributes — evidence-gated, design ready (`docs/O11Y-PLAN.md`; the stuck-subscription alert shipped with live-mode slice 1)
* OTel collector + tail-based sampling — until volume warrants
* ops transport for `erase`/`rebuild` + automated Auth0 user delete on erasure — when an ops surface exists
