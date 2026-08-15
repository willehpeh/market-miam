# Next Behaviours

The single backlog (ADR 0017). One line per item; rationale lives in the linked
doc. Legal and website work track their own remaining sections:
`docs/PRIVACY-PLAN.md` · `docs/WEBSITE-PLAN.md`.

## Product

* live mode — the storefront leads with the market the vendor is standing in; sold-out per dish, and closing the day (`docs/LIVE-MODE-PLAN.md`). Subsumes *mark as sold out*, shipped whole (slice 1); slice 2 — closing the day — is next. No *open market day*: the start follows from the schedule
* item rated for market day (the miam)
* remove item photo · clear storefront cover photo
* retiring an item doesn't check if it's been planned
* category + tags for dishes (`ItemAddedToCatalogue` v2, form + list cards)
* schedule cadence picker: every-N-weeks + one-off (domain/API/read model support both; the UI pins weekly)
* prepared-state overlay — design pass done: menus join onto occurrences (`docs/MENU-DU-JOUR-PLAN.md`, decisions 4–5). Attended state waits on open/close market day

## Polish

* dish eager rendition (`ponytail:` in `catalogue.controller.ts` — still warms the cover-photo size)
* add/revise error banners (`AddDishFailure`/`ReviseDishFailure` emitted but unreduced)
* variant follow-ups: per-variant photos · per-variant sold-out · incremental variant commands · drag-drop reorder (`docs/archive/DISH-VARIANTS-PLAN.md`)
* nine small OO refactors (#2–4, #7–12 — per-item fixes in `docs/archive/OO-SMELL-AUDIT.md`)
* act on the frontend test-audit findings — vacuous tests, untested seams, customer-frontend coverage config (`docs/archive/VENDOR-FRONTEND-TEST-AUDIT.md` · `docs/archive/CUSTOMER-FRONTEND-TEST-AUDIT.md`)

## Deferred — trigger-gated (rationale: `docs/archive/DEFERRED.md`)

* `vendorIdFrom` validation — when a failure scenario justifies it
* client-supplied idempotency — on the first relative mutation or non-repeatable side effect
* subscription as a publication requirement — when the first paid plan ships (context decisions taken: ADR 0048)
* scoped projection reset — when full-log replay gets slow or erasure volume gets user-visible
* orphan-checkpoint detection — if a checkpoint is ever renamed
* per-event dead-lettering — on the first real poison event (alert design ready: `docs/O11Y-PLAN.md`)
* composite cursor — only if append throughput bottlenecks (~300–1000/s, ADR 0028)
* per-type span attributes — evidence-gated, design ready (`docs/O11Y-PLAN.md`; the stuck-subscription alert shipped with live-mode slice 1)
* OTel collector + tail-based sampling — until volume warrants
* ops transport for `erase`/`rebuild` + automated Auth0 user delete on erasure — when an ops surface exists
