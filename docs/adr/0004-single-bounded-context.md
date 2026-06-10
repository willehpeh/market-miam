# 0004. Single bounded context for market operations

Date: 2026-05-01 · Status: Accepted

## Context

The domain spans vendor identity, catalogues, schedules, and market days, and
will eventually serve two audiences: vendors operating their business and
customers discovering it. Strategic DDD would suggest considering separate
bounded contexts per audience, but their languages haven't diverged yet.

## Decision

Keep a single bounded context — Market Days — containing the Vendor,
Catalogue, Schedule, and MarketDay aggregates. A customer-facing context may
be split out later, once the language genuinely diverges between vendor
operations and customer discovery/intent.

## Consequences

- One ubiquitous language and one model to maintain while the domain is still
  being learned; no premature context-mapping overhead.
- The customer-facing surface reuses vendor-side terms for now, which is
  acceptable until customer features grow their own concepts.
- Splitting later means partitioning event streams and read models along the
  new boundary — kept feasible because everything is already vendor-scoped.
