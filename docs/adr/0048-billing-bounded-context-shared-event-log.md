# 0048. Billing is a second bounded context on the shared event log

Date: 2026-08-11 · Status: Accepted · Amends 0004

## Context

Charging vendors is approaching (`NEXT_BEHAVIOURS.md`, "subscription as a
publication requirement"), which makes Billing the first context to stand
beside Market Days — ADR 0004's single-context decision was explicitly a
deferral, and `docs/archive/DEFERRED.md` already names Billing "a separate
bounded context (a generic subdomain — plans, invoices, payment, dunning)".
Two strategic questions need answers before modelling starts: does the new
context get its own event store, and does a possible later feature — vendors
selling to their customers through the platform (Stripe Connect) — join it or
form a further context.

## Decision

**Billing is a bounded context of its own** — its own package
(`packages/billing`), aggregates, stream namespace (`billing-…`), and
projections. This amends ADR 0004: two contexts now, Market Days and Billing.
Role orientation, for the record: in Billing the vendor *is the customer* —
Market Miam charges vendors.

**It shares the single `events` table and global ordering** (ADRs 0005/0028).
The boundary is the model, not the storage: separation is logical, enforced at
the package seam, while appends land in the one log under the one
`global_position`.

Cross-context consumption is a **published contract, not an open log**: Market
Days' entitlement projection (per `DEFERRED.md`) consumes only the billing
events named as published — `SubscriptionActivated`, `SubscriptionLapsed`, and
whatever later joins them deliberately. Everything else in the billing
namespace is internal. `packages/billing` depends on `event-sourcing`,
`shared-kernel`, and `common` only — never on `market-days` internals, nor the
reverse.

**Stripe stays behind a port.** Stripe is the system of record for payment
state; Billing records Market Miam's own facts (activation, lapse, grace
expiry, dunning outcomes), with webhook ingestion as an adapter translating
Stripe events into billing commands — idempotently, since Stripe delivers
at-least-once (this pulls in the deferred idempotency front gate,
`DEFERRED.md` "Client-supplied idempotency").

**Vendors-selling-to-customers is a further context, not Billing.** If that
feature ships it is an **Ordering** context — customer buys from vendor;
checkout, payment capture, payout, refund, dispute, and connected-account
onboarding are capabilities inside it. In Ordering the vendor is the
*merchant*; folding it into Billing would give "customer" and "payment" two
meanings in one model. What the two would share is infrastructure (Stripe
client, webhook endpoint) — shareable as an adapter, not a model. This is a
boundary statement only; Ordering is an unrecorded product-direction change
and gets no design until it is real.

Rejected:

- **A separate event store (or table) for Billing** — breaks the single
  monotonic cursor that polling subscriptions and checkpoints assume (ADRs
  0015/0028/0036); the entitlement projection would need to merge feeds, i.e.
  per-store checkpoints or a bus + outbox. Heavy infrastructure for a context
  emitting a handful of events per vendor per month, with no throughput case:
  billing volume is noise against the serialized-append ceiling. Extraction
  later stays feasible the same way ADR 0004 kept context-splitting feasible —
  streams are namespace-prefixed, so partitioning the log is mechanical.
- **Actor-qualified context names** ("Vendor Billing", "Customer Ordering") —
  "Vendor Billing" is genitively ambiguous (billing *of* vs *by* vendors);
  "Customer Ordering" falsely implies vendor-side order handling lives
  elsewhere. Plain capability names, matching "Market Days"; the role
  orientation lives in prose here.
- **Mirroring Stripe's subscription state machine as billing aggregates** —
  couples the model to a vendor's schema and invites synchronous Stripe reads,
  already prohibited in the publish path (`DEFERRED.md`).

## Consequences

- ADR 0004 is amended: the single-context decision now scopes Market Days,
  not the system.
- The entitlement seam ships as designed: billing's published events →
  local `entitlement(vendorId, active)` read model → one more clause in
  `StorefrontPublication`; the `Storefront` aggregate never learns the word
  "subscription".
- Package-boundary discipline gets teeth when Billing lands: Nx tags are
  currently empty with a permissive `*→*` rule; the Billing implementation
  introduces real tags so the dependency rules above are enforced, not
  conventional.
- Retention vs shredding is a named design constraint: invoices carry a
  ~10-year legal retention obligation (France), while ADR 0025 erases
  per-vendor data by key deletion. Billing streams must keep legally-retained
  facts out of shredded payloads or sit outside per-vendor shredding — decided
  during Billing design, not here.
- Ordering, if it comes, starts as one context; it splits further only if its
  language diverges — the same policy 0004 applied. Connected-account/KYC
  onboarding belongs there, not on `Vendor` in Market Days.
