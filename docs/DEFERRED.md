# Deferred Decisions

Genuinely-open decisions, not yet implemented and not tracked elsewhere. Resolved/built decisions live in their ADRs, `PLAN.md`, and the code; remaining **database** work is in `POSTGRES-PLAN.md`.

## vendorIdFrom error handling

`vendorIdFrom` currently does a raw cast with no validation. Error handling (throw if vendorId is missing from metadata) was deferred because no test drives it yet. Add when there's a failure scenario that justifies it.

## Client-supplied idempotency

Not needed yet. Natural idempotency already comes from three layers: client-supplied aggregate identity (`vendorId`, `itemId` arrive on the command), domain-level idempotency in handlers (e.g. `RegisterVendor` retains the original on re-registration), and optimistic concurrency (`expectedStreamPosition` rejects concurrent duplicates). Revisit when either appears: a non-idempotent *relative* mutation (e.g. "increment stock by 5", where a retry double-applies), or an external side effect that can't be repeated (payment capture, outbound email/SMS).

When added, it is a separate concern from causation — a distinct metadata field plus a *front gate* that dedups before the handler executes (on a hit: skip execution, append nothing, return the prior outcome). Do not reuse the causation id slot for it: the idempotency key must be stable across retries, whereas the causation id must be unique per dispatch — collapsing them corrupts lineage in exactly the retry case. The causation id stays internally generated. (A client-supplied *correlation seed* is a third, separate input: accept-external-or-generate into the `correlationId` ALS field.) If the front-gate ever needs a durable dedup store, that store is pg — pull this item into `POSTGRES-PLAN.md` when it lands.

## Subscription as a publication requirement

Publishing a storefront requires readiness (ADR 0031); once we charge vendors, an **active subscription** joins the list. Billing is a separate bounded context (a generic subdomain — plans, invoices, payment, dunning — its language does not belong in Market Days; cf. ADR 0004). Not built: not charging yet.

The seam is already shaped. Readiness is assembled by the `StorefrontPublication` domain service from symmetric self-queries; the subscription requirement enters as *one more*: `subscriptions.isActiveFor(vendor)` behind a **local entitlement read model** — a projection fed by the billing context's events (`SubscriptionActivated`/`…Lapsed` → `entitlement(vendorId, active)`). The service gains one `missing.push('subscription')`; the `Storefront` aggregate never learns the word "subscription." Do **not** put a synchronous Stripe call in the publish path — project billing events into the local entitlement instead, keeping the check a local read. Forced when the first paid plan ships.
