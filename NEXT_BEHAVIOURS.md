# Next Behaviours

The single backlog (ADR 0017). One line per item; rationale lives in the linked
doc. Legal and website work track their own remaining sections:
`docs/PRIVACY-PLAN.md` · `docs/WEBSITE-PLAN.md`.

## Product

* menu du jour UI — plan/unplan + mark-as-sold-out are domain-built; no HTTP endpoint, no UI in either frontend
* open market day · close market day
* item rated for market day (the miam)
* remove item photo · clear storefront cover photo
* retiring an item doesn't check if it's been planned
* category + tags for dishes (`ItemAddedToCatalogue` v2, form + list cards)
* schedule cadence picker: every-N-weeks + one-off (domain/API/read model support both; the UI pins weekly)
* prepared-state overlay — join actual market-day events onto expanded occurrences (needs a design pass; `docs/archive/MARKET-SCHEDULE-FOLLOWUPS.md` §5)

## Polish

* dish eager rendition (`ponytail:` in `catalogue.controller.ts` — still warms the cover-photo size)
* add/revise error banners (`AddDishFailure`/`ReviseDishFailure` emitted but unreduced)
* variant follow-ups: per-variant photos · per-variant sold-out · incremental variant commands · drag-drop reorder (`docs/archive/DISH-VARIANTS-PLAN.md`)

## Deferred — trigger-gated (rationale: `docs/archive/DEFERRED.md`)

* `vendorIdFrom` validation — when a failure scenario justifies it
* client-supplied idempotency — on the first relative mutation or non-repeatable side effect
* subscription as a publication requirement — when the first paid plan ships
* scoped projection reset — when full-log replay gets slow or erasure volume gets user-visible
* orphan-checkpoint detection — if a checkpoint is ever renamed
* per-event dead-lettering — on the first real poison event (alert design ready: `docs/O11Y-PLAN.md`)
* composite cursor — only if append throughput bottlenecks (~300–1000/s, ADR 0028)
* per-type span attributes · stuck-subscription alert — evidence-gated, designs ready (`docs/O11Y-PLAN.md`)
* OTel collector + tail-based sampling — until volume warrants
* ops transport for `erase`/`rebuild` + automated Auth0 user delete on erasure — when an ops surface exists
