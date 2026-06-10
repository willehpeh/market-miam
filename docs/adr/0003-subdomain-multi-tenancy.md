# 0003. Subdomain-based multi-tenancy

Date: 2026-05-01 · Status: Accepted

## Context

Each vendor gets their own branded site (Shopify model, not a marketplace),
preserving the personal vendor-customer relationship of French marché
culture. Tenancy could be served by per-tenant deployments, custom domains,
or a shared application discriminating tenants by hostname.

## Decision

Serve all vendors from a single shared application with subdomain-based
tenancy (`chez-mohamed.votreplateforme.fr`), per-vendor theming, and data
isolated by vendor scope. Custom domains (`www.chez-mohamed.fr`) are deferred
as a potential future paid tier.

## Consequences

- One deployment and one database to operate; onboarding a vendor needs no
  infrastructure work.
- Every query and event stream must be vendor-scoped — isolation is enforced
  in code, not by physical separation.
- The subdomain is the tenant discriminator, so it must be resolvable early
  in every request.
- Adding custom domains later is additive (TLS provisioning, host mapping)
  and doesn't disturb the tenancy model.
