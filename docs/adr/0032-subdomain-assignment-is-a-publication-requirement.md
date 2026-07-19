# 0032. An assigned subdomain is a storefront publication requirement

Date: 2026-07-19 · Status: Accepted

Amends ADR 0031 (publication readiness) · builds on ADR 0003 (subdomain registry).

## Context

ADR 0031 gated publication on five readiness facts (title, description, cover,
catalogue, schedule) but deliberately left the **subdomain** out. Subdomains are
assigned out-of-band: the `subdomain_registry` (ADR 0003) is an authoritative
write-model table with no vendor command or UI yet — rows are seeded manually
per env; a self-service `SubdomainAssigned` command is deferred.

Building the vendor publish button surfaced the gap: a storefront can meet all
five requirements yet have no subdomain. Publishing then sets `published = true`,
but the customer path still 404s (subdomain unresolved) — the vendor is live
nowhere. Publishing an unreachable storefront is meaningless.

## Decision

- **An assigned subdomain is a sixth publication requirement.**
  `StorefrontPublication` appends `url` to `missing[]` when the vendor has no
  subdomain, so `missing` is now `[title, description, cover, catalogue,
  schedule, url]`. Never publish an unreachable storefront.

- **The subdomain is not an aggregate**, so it does not answer a self-query like
  the other contributors. It is a table (ADR 0003), read via a new **reverse
  lookup `SubdomainRegistry.subdomainFor(vendorId)`** — the mirror of the
  customer-side `vendorFor(subdomain)`, cheap and unambiguous because
  `vendor_id` is `UNIQUE`. The handler reads presence and passes a plain
  `hasSubdomain` boolean into the service, which **stays pure** (no infra
  dependency) — one more clause, symmetric with the subscription clause 0031
  reserved for Billing.

- **The same reverse read composes the subdomain onto the vendor read.**
  `FindVendorStorefront` returns `subdomain: string | null` (read-time, not
  projected), so the vendor app can show its storefront URL.

## Consequences

- **Operational coupling, accepted.** With subdomain assignment still
  out-of-band, a vendor cannot reach "ready" unaided — an operator must seed
  their `subdomain_registry` row before they can go live. This is the interim
  reality until the `SubdomainAssigned` command ships; it makes the deferred
  self-service assignment the natural next step, not a nicety.

- The vendor dashboard gates the Publier button on the subdomain client-side; a
  storefront ready in every other respect but lacking a subdomain shows "URL en
  cours d'attribution" instead of a button (the subdomain is not
  vendor-actionable, so it is not a checklist step).

- The dev seed registers a subdomain for the local sign-in vendor so the
  onboard → publish → live loop is exercisable in development.

- Erasure already deletes the subdomain row (ADR 0025); an erased vendor reads
  back `subdomain: null` and cannot (re)publish — correct.
